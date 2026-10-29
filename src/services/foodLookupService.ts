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

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleaned)}.json`,
      {
        headers: {
          'User-Agent': 'PetPulse/1.0 (safe-snacker)',
          Accept: 'application/json',
        },
      }
    );
    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        brands?: string;
        ingredients_text?: string;
        image_front_url?: string;
      };
    };

    if (data.status === 1 && data.product) {
      return {
        barcode: cleaned,
        productName: data.product.product_name || 'Unknown Product',
        brand: data.product.brands || '',
        ingredientsText: data.product.ingredients_text || 'Ingredients not listed',
        imageUrl: data.product.image_front_url || undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
