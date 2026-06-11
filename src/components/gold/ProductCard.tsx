"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { fmtJod } from "@/lib/format";
import type { GoldProduct } from "@/lib/client";

export type ProductCardProps = {
  product: GoldProduct;
  /** Tap on the orange + FAB (rendered for in-stock products only). */
  onAdd: (product: GoldProduct) => void;
  /** Marks this card as the tutorial 5g anchor (gold-5g-card / gold-5g-add). */
  tutorialAnchor?: boolean;
};

/** Gold shop product card — ported from design 08 (2-col grid card). */
export function ProductCard({ product, onAdd, tutorialAnchor }: ProductCardProps) {
  const weightLabel = `${product.weightGrams}g`;

  return (
    <div
      data-tut={tutorialAnchor ? "gold-5g-card" : undefined}
      className={`bg-surface-container-lowest rounded-xl p-3 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col relative group overflow-hidden border border-surface-container ${
        product.inStock ? "" : "opacity-90"
      }`}
    >
      {!product.inStock && (
        <div className="absolute top-2 left-2 z-[2] bg-surface-container-highest px-2 py-0.5 rounded-full pointer-events-none">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Out of stock</span>
        </div>
      )}

      {/* Whole-card tap target → product detail (keeps the + button independent). */}
      <Link
        href={`/gold/${product.sku}`}
        aria-label={`${weightLabel} ${product.name} — view details`}
        className="absolute inset-0 z-[1] rounded-xl"
      />

      <div
        className={`aspect-square rounded-lg bg-surface-container-low mb-3 flex items-center justify-center overflow-hidden ${
          product.inStock ? "" : "grayscale"
        }`}
      >
        <Image
          src={product.imageUrl}
          alt={`${product.brand} ${weightLabel} gold bar`}
          width={320}
          height={240}
          unoptimized
          className="w-full h-full object-contain p-2"
        />
      </div>

      <div className="space-y-1">
        <p className="text-label-sm font-label-sm text-primary uppercase tracking-wider">{weightLabel}</p>
        <h3 className="text-body-md font-body-md font-bold text-on-background leading-tight">{product.name}</h3>
        <p className="text-body-lg font-body-lg text-on-surface-variant mt-2">{fmtJod(product.priceMils)}</p>
      </div>

      {product.inStock && (
        <button
          type="button"
          data-tut={tutorialAnchor ? "gold-5g-add" : undefined}
          aria-label={`Buy ${weightLabel} ${product.name}`}
          onClick={() => onAdd(product)}
          className="absolute bottom-1 right-1 z-[2] p-2"
        >
          {/* 32px visual FAB per design, padded to a 48px tap target. */}
          <span className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
            <Icon name="add" style={{ fontSize: 20 }} />
          </span>
        </button>
      )}
    </div>
  );
}
