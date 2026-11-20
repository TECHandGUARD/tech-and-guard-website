export const companyEmail = 'info@techandguard.co.za';
export const companyPhone = '073 112 7124';
export const companyTelephoneLink = 'tel:+27731127124';
export const companyWhatsAppShortLink = 'https://wa.me/message/B3ZY56KS6PR3F1';
export const companyWhatsAppNumber = '27731127124';

export const defaultEnquiryMessage = [
  'Hello Tech & Guard, I’d like help with a digital project.',
  '',
  'My business or project:',
  'What I want to achieve:',
  'Who will use it:',
  'What I already have (website, brand or content):',
  'Preferred timeline or budget, if known:',
  'My town or suburb:',
].join('\n');

export const defaultProductEnquiryMessage = [
  'Hello Tech & Guard, I’d like to enquire about a product.',
  '',
  'Product name or SKU:',
  'Model, colour or other options:',
  'My town or suburb:',
  'Please confirm availability and delivery before I proceed.',
].join('\n');

export function whatsappLink(message: string) {
  return `https://wa.me/${companyWhatsAppNumber}?text=${encodeURIComponent(message)}`;
}
