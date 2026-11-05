export interface InquiryInput {
  name: string;
  email: string;
  service: string;
  message: string;
}
export function validateInquiry(value: unknown): InquiryInput | null {
  if (!value || typeof value !== 'object') return null;
  const fields = value as Record<string, unknown>;
  const name = typeof fields.name === 'string' ? fields.name.trim() : '';
  const email = typeof fields.email === 'string' ? fields.email.trim().toLowerCase() : '';
  const service = typeof fields.service === 'string' ? fields.service : '';
  const message = typeof fields.message === 'string' ? fields.message.trim() : '';
  if (
    name.length < 2 ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 ||
    message.length > 5000 ||
    !['Architecture', 'Interior design', 'Landscape design'].includes(service)
  )
    return null;
  return { name, email, service, message };
}
