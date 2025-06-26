import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import PNGtext from "png-chunk-text";

const encodeBase64 = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...utf8Bytes);
  return btoa(binary);
};

const decodeBase64 = (b64: string): string => {
  const binary = atob(b64);
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
};

/**
 * Helper function to sanitize and fix common JSON formatting issues
 * @param jsonString - The potentially malformed JSON string
 * @returns A sanitized JSON string that's more likely to be parsed successfully
 */
const sanitizeJson = (jsonString: string): string => {
  let result = jsonString;
  
  // Replace single quotes with double quotes for property names and string values
  result = result.replace(/([{,]\s*)(')?([a-zA-Z0-9_]+)(')?(\s*:)/g, '$1"$3"$5');
  
  // Replace unquoted string values with quoted ones
  result = result.replace(/:\s*'([^']*)'/g, ':"$1"');
  
  // Fix trailing commas in objects and arrays
  result = result.replace(/,\s*([\]}])/g, '$1');
  
  // Fix missing quotes around string values
  result = result.replace(/:\s*([a-zA-Z][a-zA-Z0-9_]*)(\s*[,}\]])/g, ':"$1"$2');
  
  // Fix newlines in string values
  result = result.replace(/"([^"]*)\n([^"]*)"/, '"$1\\n$2"');
  
  // Fix unescaped quotes in string values
  result = result.replace(/([^\\])"([^"]*)"([^"]*)"/, '$1"$2\\"$3"');
  
  // Fix missing commas between properties
  result = result.replace(/("[^"]*"|\d+)\s*\n\s*("[a-zA-Z0-9_]+"\s*:)/g, '$1,\n$2');
  
  // Remove comments
  result = result.replace(/\/\/.*\n/g, '\n');
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return result;
};

export const writeCharacterToPng = async (file: File, data: string): Promise<Blob> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const filteredChunks = chunks.filter(chunk => {
    if (chunk.name !== "tEXt") return true;
    const { keyword } = PNGtext.decode(chunk.data);
    return !["chara", "ccv3"].includes(keyword.toLowerCase());
  });

  const base64Data = encodeBase64(data);
  filteredChunks.splice(-1, 0, PNGtext.encode("chara", base64Data));

  try {
    const v3Data = JSON.parse(data);
    v3Data.spec = "chara_card_v3";
    v3Data.spec_version = "3.0";
    const base64V3 = encodeBase64(JSON.stringify(v3Data));
    filteredChunks.splice(-1, 0, PNGtext.encode("ccv3", base64V3));
  } catch (err) {
    console.warn("Failed to add ccv3 chunk:", err);
  }

  const newBuffer = encode(filteredChunks);
  return new Blob([newBuffer], { type: "image/png" });
};

export const readCharacterFromPng = async (file: File): Promise<any> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const textChunks = chunks
    .filter(chunk => chunk.name === "tEXt")
    .map(chunk => PNGtext.decode(chunk.data));

  const ccv3 = textChunks.find(c => c.keyword.toLowerCase() === "ccv3");
  const chara = textChunks.find(c => c.keyword.toLowerCase() === "chara");

  const raw = ccv3?.text || chara?.text;
  if (!raw) throw new Error("No PNG metadata found.");

  try {
    // Giải mã Base64 và parse JSON
    const decodedText = decodeBase64(raw);
    try {
      return JSON.parse(decodedText);
    } catch (parseError) {
      console.warn("Initial JSON parsing failed, attempting to sanitize:", parseError);
      
      // Sanitize the JSON content before parsing
      const sanitized = sanitizeJson(decodedText);
      return JSON.parse(sanitized);
    }
  } catch (error: unknown) {
    console.error("Error parsing character data:", error);
    // Xử lý error một cách an toàn với kiểu unknown
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse character data: ${errorMessage}`);
  }
};

export const parseCharacterCard = async (file: File) => {
  if (!file.name.toLowerCase().endsWith(".png")) {
    throw new Error("Unsupported format");
  }
  // readCharacterFromPng đã thực hiện JSON.parse nên không cần parse lại
  return await readCharacterFromPng(file);
};