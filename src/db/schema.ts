import { relations, sql } from "drizzle-orm";
import {
  boolean, check, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex,
} from "drizzle-orm/pg-core";

export const roastEnum = pgEnum("roast", ["claro", "medio", "oscuro"]);
export const processEnum = pgEnum("process", ["lavado", "natural", "honey"]);
export const grindEnum = pgEnum("grind", ["grano", "espresso", "media", "gruesa"]);
export const shippingEnum = pgEnum("shipping_method", ["retiro", "envio"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment", "paid", "preparing", "shipped", "delivered", "expired", "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "requires_payment", "requires_action", "succeeded", "failed",
]);

/** Paleta de la bolsa ilustrada de cada café */
export type BagPalette = { paper: string; ink: string; accent: string };

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  farm: text("farm").notNull(),
  producer: text("producer").notNull(),
  altitude: integer("altitude").notNull(),
  process: processEnum("process").notNull(),
  roast: roastEnum("roast").notNull(),
  variety: text("variety").notNull(),
  notes: text("notes").array().notNull(),
  description: text("description").notNull(),
  palette: jsonb("palette").$type<BagPalette>().notNull(),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    weightGrams: integer("weight_grams").notNull(),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
  },
  t => [
    check("stock_non_negative", sql`${t.stock} >= 0`),
    check("price_positive", sql`${t.priceCents} > 0`),
    uniqueIndex("variant_product_weight").on(t.productId, t.weightGrams),
  ]
);

export type Address = { line1: string; city: string; state: string; notes?: string };

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    number: serial("number").notNull(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    shippingMethod: shippingEnum("shipping_method").notNull(),
    address: jsonb("address").$type<Address>(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** Hasta cuándo se mantiene reservado el stock si no se paga */
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  t => [index("orders_status_idx").on(t.status), index("orders_created_idx").on(t.createdAt)]
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: integer("variant_id").notNull().references(() => variants.id),
  productName: text("product_name").notNull(),
  weightGrams: integer("weight_grams").notNull(),
  grind: grindEnum("grind").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
  quantity: integer("quantity").notNull(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: paymentStatusEnum("status").notNull().default("requires_payment"),
  amountCents: integer("amount_cents").notNull(),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  failureCode: text("failure_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Eventos de webhook procesados: la clave primaria garantiza idempotencia */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  paymentId: text("payment_id").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productsRelations = relations(products, ({ many }) => ({ variants: many(variants) }));
export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems), payments: many(payments) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(variants, { fields: [orderItems.variantId], references: [variants.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type Grind = (typeof grindEnum.enumValues)[number];
