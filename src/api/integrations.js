/**
 * Standalone integration stubs.
 * These were previously provided by the Base44 platform.
 * They are stubbed out since there is no backend service.
 */

async function notAvailable(name) {
  throw new Error(`Integration "${name}" is not available without a backend service. Consider implementing a direct API call instead.`);
}

export const InvokeLLM = (params) => notAvailable('InvokeLLM');
export const SendEmail = (params) => notAvailable('SendEmail');
export const SendSMS = (params) => notAvailable('SendSMS');
export const GenerateImage = (params) => notAvailable('GenerateImage');
export const ExtractDataFromUploadedFile = (params) => notAvailable('ExtractDataFromUploadedFile');

/**
 * Simple file upload using object URLs (local-only, no server).
 * Files are stored as blob URLs which persist only for the page session.
 */
export const UploadFile = async ({ file }) => {
  const url = URL.createObjectURL(file);
  return { file_url: url };
};

export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};

