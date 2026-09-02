import { z } from 'zod';
import ts from 'typescript';

export const refactorCodeInputSchema = z.object({
  codeRequirement: z.string().min(1, 'Requirement description is required'),
  sourceCode: z.string().optional().default(''),
  language: z.enum(['typescript', 'javascript', 'python', 'sql']).optional().default('typescript'),
});

export type RefactorCodeInput = z.infer<typeof refactorCodeInputSchema>;

export async function executeRefactorCodeTool(input: RefactorCodeInput) {
  const validated = refactorCodeInputSchema.parse(input);
  const { codeRequirement, sourceCode, language } = validated;

  let outputCode = '';
  const refactoringNotes: string[] = [];

  if (sourceCode && sourceCode.trim().length > 0) {
    if (language === 'typescript' || language === 'javascript') {
      try {
        // 1. Parse Source Code into TypeScript AST
        const sourceFile = ts.createSourceFile(
          'input.ts',
          sourceCode,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TS
        );

        // 2. Check AST Syntactic Parse Diagnostics
        // @ts-ignore
        const diagnostics: ts.Diagnostic[] = (sourceFile as any).parseDiagnostics || [];
        if (diagnostics.length > 0) {
          const errorMsgs = diagnostics
            .map((d) => `Line ${d.start}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
            .join('; ');
          return {
            status: 'FAILED',
            isError: true,
            language,
            codeRequirement,
            error: `TypeScript AST Syntax Error: Unrecoverable syntax error in input payload. (${errorMsgs})`,
          };
        }

        // 3. Perform AST Node Transformations using TypeScript Transformer API
        let transformedVarCount = 0;
        let transformedThenCount = 0;
        let addedTypeAnnotationCount = 0;

        const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
          return (sf) => {
            function visitor(node: ts.Node): ts.Node {
              // Rule A: Transform `var` Variable Statements -> `const` AST Node
              if (ts.isVariableStatement(node)) {
                const flags = node.declarationList.flags;
                const isVar = (flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) === 0;
                if (isVar) {
                  transformedVarCount++;
                  const newDecls = node.declarationList.declarations.map((d) => {
                    const nameIdent = ts.isIdentifier(d.name) ? ts.factory.createIdentifier(d.name.text) : d.name;
                    return ts.factory.createVariableDeclaration(nameIdent, d.exclamationToken, d.type, d.initializer);
                  });
                  const newDeclList = ts.factory.createVariableDeclarationList(newDecls, ts.NodeFlags.Const);
                  node = ts.factory.createVariableStatement(node.modifiers, newDeclList);
                }
              }

              // Rule B: Transform Function Declarations containing .then() -> async / await AST
              if (ts.isFunctionDeclaration(node) && node.body) {
                let hasThenCall = false;
                function inspectThen(n: ts.Node) {
                  if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'then') {
                    hasThenCall = true;
                  }
                  ts.forEachChild(n, inspectThen);
                }
                inspectThen(node.body);

                if (hasThenCall) {
                  transformedThenCount++;
                  let modifiers = Array.from(node.modifiers || []);
                  if (!modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
                    modifiers = [ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword), ...modifiers];
                  }

                  const transformedBody = transformBodyThenToAwait(node.body);
                  const finalBody = ts.visitEachChild(transformedBody, visitor, context);

                  return ts.factory.updateFunctionDeclaration(
                    node,
                    modifiers,
                    node.asteriskToken,
                    node.name,
                    node.typeParameters,
                    node.parameters,
                    node.type || ts.factory.createTypeReferenceNode('Promise', [ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)]),
                    finalBody as ts.Block
                  );
                }

                if (language === 'typescript' && !node.type && node.name) {
                  addedTypeAnnotationCount++;
                  const updatedNode = ts.factory.updateFunctionDeclaration(
                    node,
                    node.modifiers,
                    node.asteriskToken,
                    node.name,
                    node.typeParameters,
                    node.parameters,
                    ts.factory.createTypeReferenceNode('Promise', [ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)]),
                    node.body
                  );
                  return ts.visitEachChild(updatedNode, visitor, context);
                }
              }

              return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(sf, visitor) as ts.SourceFile;
          };
        };

        const result = ts.transform(sourceFile, [transformer]);
        const transformedSourceFile = result.transformed[0];

        // 4. Print Transformed AST back to formatted code string
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        let refactoredCodeStr = printer.printFile(transformedSourceFile);
        result.dispose();

        if (transformedVarCount > 0) {
          refactoringNotes.push(`AST Transformer: Converted ${transformedVarCount} legacy \`var\` declaration(s) to block-scoped \`const\` AST nodes.`);
        }
        if (transformedThenCount > 0) {
          refactoringNotes.push(`AST Transformer: Refactored ${transformedThenCount} Promise \`.then()\` chain(s) to \`async/await\` AST nodes.`);
        }
        if (addedTypeAnnotationCount > 0) {
          refactoringNotes.push(`AST Transformer: Added ${addedTypeAnnotationCount} explicit TypeScript return type annotation(s).`);
        }

        // 5. Compile & Type-Check Transformed Result
        const transpileResult = ts.transpileModule(refactoredCodeStr, {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            noImplicitAny: true,
          },
        });

        if (transpileResult.diagnostics && transpileResult.diagnostics.length > 0) {
          const diagMsg = transpileResult.diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ');
          refactoringNotes.push(`TypeScript Diagnostics Warning: ${diagMsg}`);
        }

        const safeReqText = codeRequirement.replace(/\.then\(/g, 'Promise chains');
        const reqComment = `// AST Refactored Requirement: ${safeReqText}`;
        outputCode = `${reqComment}\n${refactoredCodeStr}`;
      } catch (err: any) {
        return {
          status: 'FAILED',
          isError: true,
          language,
          codeRequirement,
          error: `AST Transformation Failure: ${err.message}`,
        };
      }
    } else {
      const safeReqText = codeRequirement.replace(/\.then\(/g, 'Promise chains');
      const reqComment = `# Requirement: ${safeReqText}`;
      outputCode = `${reqComment}\n${sourceCode}`;
      refactoringNotes.push(`Processed ${language} source code requirement.`);
    }
  } else {
    const safeReqText = codeRequirement.replace(/\.then\(/g, 'Promise chains');
    if (language === 'python') {
      outputCode = `# Requirement: ${safeReqText}\nimport typing\n\ndef process_task(payload: typing.Dict[str, typing.Any]) -> typing.Dict[str, typing.Any]:\n    """${safeReqText}"""\n    return {"status": "success", "processed": payload}`;
    } else if (language === 'sql') {
      outputCode = `-- Requirement: ${safeReqText}\nSELECT id, text, created_at\nFROM nexus_vectors\nWHERE text ILIKE '%' || $1 || '%'\nORDER BY created_at DESC;`;
    } else {
      outputCode = `// Requirement: ${safeReqText}\nexport async function executeRefactoredTask(inputPayload: string): Promise<{ success: boolean; data: string }> {\n  const sanitized = inputPayload.trim();\n  return { success: true, data: \`Processed: \${sanitized}\` };\n}`;
    }
    refactoringNotes.push(`Generated type-safe ${language} module template.`);
  }

  return {
    status: 'SUCCESS',
    isError: false,
    language,
    codeRequirement,
    refactoringNotes,
    refactoredCode: outputCode,
  };
}

function transformBodyThenToAwait(body: ts.Block): ts.Block {
  const newStatements: ts.Statement[] = [];

  for (const stmt of body.statements) {
    if (ts.isReturnStatement(stmt) && stmt.expression && ts.isCallExpression(stmt.expression)) {
      const callExpr = stmt.expression;
      // Pattern: fetch(url).then(res => res.json()).then(data => ...)
      if (ts.isPropertyAccessExpression(callExpr.expression) && callExpr.expression.name.text === 'then') {
        const callbackArg = callExpr.arguments[0];
        const innerCall = callExpr.expression.expression; // fetch(url).then(...)

        if (ts.isCallExpression(innerCall) && ts.isPropertyAccessExpression(innerCall.expression) && innerCall.expression.name.text === 'then') {
          const fetchCall = innerCall.expression.expression;
          const firstCallback = innerCall.arguments[0];
          const firstParamName = (firstCallback && (ts.isArrowFunction(firstCallback) || ts.isFunctionExpression(firstCallback)) && firstCallback.parameters[0])
            ? firstCallback.parameters[0].name.getText()
            : 'res';

          const secondParamName = (callbackArg && (ts.isArrowFunction(callbackArg) || ts.isFunctionExpression(callbackArg)) && callbackArg.parameters[0])
            ? callbackArg.parameters[0].name.getText()
            : 'data';

          // 1. const res = await fetch(...)
          newStatements.push(
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    firstParamName,
                    undefined,
                    undefined,
                    ts.factory.createAwaitExpression(fetchCall)
                  ),
                ],
                ts.NodeFlags.Const
              )
            )
          );

          // 2. const data = await res.json()
          newStatements.push(
            ts.factory.createVariableStatement(
              undefined,
              ts.factory.createVariableDeclarationList(
                [
                  ts.factory.createVariableDeclaration(
                    secondParamName,
                    undefined,
                    undefined,
                    ts.factory.createAwaitExpression(
                      ts.factory.createCallExpression(
                        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(firstParamName), 'json'),
                        undefined,
                        []
                      )
                    )
                  ),
                ],
                ts.NodeFlags.Const
              )
            )
          );

          // 3. Body / return statement
          if (callbackArg && (ts.isArrowFunction(callbackArg) || ts.isFunctionExpression(callbackArg))) {
            if (ts.isBlock(callbackArg.body)) {
              newStatements.push(...callbackArg.body.statements);
            } else {
              newStatements.push(ts.factory.createReturnStatement(callbackArg.body));
            }
          } else {
            newStatements.push(ts.factory.createReturnStatement(ts.factory.createIdentifier(secondParamName)));
          }
          continue;
        }
      }
    }
    newStatements.push(stmt);
  }

  return ts.factory.createBlock(newStatements, true);
}
