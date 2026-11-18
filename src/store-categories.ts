export const storeCategories = {
 work: 'Work & carry',
 power: 'Power & charging',
 audio: 'Audio',
 everyday: 'Everyday accessories',
} as const;

export type StoreCategory = keyof typeof storeCategories;

export function storeCategory(title: string): StoreCategory {
 if (/headphones?|earphones?|earbuds?|speaker/i.test(title)) return 'audio';
 if (/charg(?:e|er|ing)|power bank|usb.*cable/i.test(title)) return 'power';
 if (/backpack|laptop|ultrabook|keyboard/i.test(title)) return 'work';
 return 'everyday';
}
