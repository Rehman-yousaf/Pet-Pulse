/**
 * Open Food Facts barcode lookup for Safe Snacker.
 */

export interface ScannedProduct {
  barcode: string;
  productName: string;
  brand?: string;
  ingredientsText: string;
  imageUrl?: string;
}

export async function fetchProductByBarcode(barcode: string): Promise<ScannedProduct | null> {
  const cleaned = barcode.trim();
  if (!cleaned) return null;
  console.log('[SafeSnacker] Open Food Facts lookup', cleaned);

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json`,
      {
        headers: {
          'User-Agent': 'PetPulseApp - Android/iOS - Version 1.0',
          Accept: 'application/json',
        },
      }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        ingredients_text?: string;
        ingredients_text_en?: string;
        image_front_url?: string;
      };
    };

    if (data.status === 1 && data.product) {
      console.log('[SafeSnacker] barcode found', cleaned, data.product.product_name || data.product.product_name_en);
      return {
        barcode: cleaned,
        productName: data.product.product_name || data.product.product_name_en || 'Scanned Food Product',
        brand: data.product.brands || '',
        ingredientsText:
          data.product.ingredients_text ||
          data.product.ingredients_text_en ||
          'Ingredients list unavailable for this barcode.',
        imageUrl: data.product.image_front_url || undefined,
      };
    }

    console.log('[SafeSnacker] barcode not in Open Food Facts', cleaned);
    return null;
  } catch {
    return null;
  }
}
