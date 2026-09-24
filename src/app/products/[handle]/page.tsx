import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/atoms/Badge/Badge";
import { JsonLd } from "@/components/atoms/JsonLd/JsonLd";
import { Price } from "@/components/atoms/Price/Price";
import { RichText } from "@/components/atoms/RichText/RichText";
import { ProductGallery } from "@/components/organisms/ProductGallery/ProductGallery";
import { VariantPicker } from "@/components/organisms/VariantPicker/VariantPicker";
import { getProduct } from "@/lib/catalog/fetchers";
import { buildBreadcrumbList } from "@/lib/seo/breadcrumbs";
import { buildProductJsonLd } from "@/lib/seo/product";
import {
  parseVariantSelection,
  resolveVariant,
  selectionFromVariant,
} from "@/lib/variants/selection";
import { AddToCart } from "./AddToCart";
import styles from "./page.module.scss";

function productPath(handle: string) {
  return `/products/${handle}`;
}

export async function generateMetadata(props: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const product = await getProduct(handle);

  if (!product) {
    return { title: "Product not found" };
  }

  const image = product.images[0];

  return {
    title: product.title,
    // The plain-text field, not `seo.description`: that one returns HTML for 17 of the 30
    // products and is truncated mid-sentence for 23 of them (verified 2026-09-23).
    description: product.description,
    alternates: {
      // Variant params identify a variant, not a different product, so every one of them
      // points at the clean product URL (§5.5).
      canonical: productPath(handle),
    },
    openGraph: {
      title: product.title,
      description: product.description,
      type: "website",
      images: image ? [{ url: image.url, alt: image.altText ?? product.title }] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[handle]">) {
  const [{ handle }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const product = await getProduct(handle);

  if (!product) {
    notFound();
  }

  const requested = parseVariantSelection(searchParams, product.options);
  const variant = resolveVariant(product.variants, requested);

  // The selection actually on screen, which is the requested one filled in from the
  // resolved variant — so a partial `?color=moss` link still shows a complete picker.
  const selection = variant ? selectionFromVariant(variant) : requested;

  const path = productPath(handle);
  const isOnSale =
    variant?.compareAtPrice != null &&
    Number(variant.compareAtPrice.amount) > Number(variant.price.amount);

  const breadcrumbs = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: product.title, path },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <JsonLd data={buildProductJsonLd(product, path)} />

      <div className={styles.page}>
        <ProductGallery
          images={product.images}
          title={product.title}
          activeImageUrl={variant?.image?.url}
        />

        <div className={styles.details}>
          <header className={styles.header}>
            <h1 className={styles.title}>{product.title}</h1>
            <div className={styles.priceRow}>
              {variant && (
                <Price
                  price={variant.price}
                  compareAtPrice={variant.compareAtPrice}
                  isOnSale={isOnSale}
                />
              )}
              {isOnSale && <Badge tone="accent">Sale</Badge>}
            </div>
          </header>

          {product.options.length > 0 && (
            <VariantPicker
              handle={handle}
              options={product.options}
              variants={product.variants}
              selection={selection}
            />
          )}

          <AddToCart available={variant?.availableForSale ?? false} />

          {product.descriptionHtml && (
            <section aria-labelledby="description-heading" className={styles.description}>
              <h2 id="description-heading" className={styles.sectionTitle}>
                Details
              </h2>
              {/* Raw from the API: RichText sanitizes it, and is the only place that may. */}
              <RichText html={product.descriptionHtml} />
            </section>
          )}

          <p className={styles.back}>
            <Link href="/">Back to home</Link>
          </p>
        </div>
      </div>
    </>
  );
}
