import { describe, it, expect } from 'vitest';
import { executeParseVisionTagsTool, decodeBinaryImageHeader } from '../tools/parseVisionTagsTool';

// Valid 1x1 Red PNG Base64
const VALID_1X1_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// Valid 1x1 JPEG Base64
const VALID_1X1_JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

// Invalid Non-Image Base64 Payload
const INVALID_NON_IMAGE_BASE64 = 'data:image/png;base64,SGVsbG8gV29ybGQgdGhpcyBpcyBub3QgYW4gaW1hZ2UgZGF0YSBhdCBhbGwh';

describe('Vision Pixel Analysis Tool & Binary Image Decoder', () => {
  it('correctly decodes valid PNG binary image payload and extracts true dimensions', async () => {
    const res = await executeParseVisionTagsTool({
      imagePrompt: 'Analyze test PNG image',
      imagePayload: VALID_1X1_PNG,
    });

    expect(res.isError).toBe(false);
    expect(res.status).toBe('PROCESSED');
    expect(res.visualMetrics?.format).toBe('png');
    expect(res.visualMetrics?.widthPx).toBe(1);
    expect(res.visualMetrics?.heightPx).toBe(1);
    expect(res.visualMetrics?.entropyScore).toBeGreaterThan(0);
    expect(res.visualMetrics?.luminanceScore).toBeGreaterThanOrEqual(0);
  });

  it('correctly decodes valid JPEG binary image payload and extracts true dimensions', async () => {
    const rawJpeg = VALID_1X1_JPEG.split(',')[1];
    const buf = Buffer.from(rawJpeg, 'base64');
    const decoded = decodeBinaryImageHeader(buf);

    expect(decoded).not.toBeNull();
    expect(decoded?.format).toBe('jpeg');
    expect(decoded?.widthPx).toBe(1);
    expect(decoded?.heightPx).toBe(1);
  });

  it('rejects non-image arbitrary Base64 strings with isError: true', async () => {
    const res = await executeParseVisionTagsTool({
      imagePrompt: 'Analyze fake image payload',
      imagePayload: INVALID_NON_IMAGE_BASE64,
    });

    expect(res.isError).toBe(true);
    expect(res.status).toBe('UNSUPPORTED');
    expect(res.content).toContain('Invalid image format');
  });

  it('handles vision prompt tag parsing when no payload is provided', async () => {
    const res = await executeParseVisionTagsTool({
      imagePrompt: 'DAG architecture node topology diagram',
    });

    expect(res.isError).toBe(false);
    expect(res.modality).toBe('vision_prompt_analysis');
    expect(res.extractedElements?.length).toBeGreaterThan(0);
  });
});
