export type Product = {
  id: string;
  user_id: string;
  name: string;
  composition: string;
  package_type: string;
  package_detail: string;
  hna: number;
  tax_percentage: number;
  created_at: string;
  updated_at: string;
};

export type OfferItem = {
  id: string;
  offer_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  composition_snapshot: string;
  package_snapshot: string;
  quantity: number;
  hna_snapshot: number;
  tax_percentage: number;
  price_with_tax: number;
  discount_percentage: number;
  final_unit_price: number;
  subtotal: number;
};

export type Offer = {
  id: string;
  user_id: string;
  offer_number: string;
  recipient_name: string;
  institution: string | null;
  contact_person: string | null;
  contact_number: string | null;
  offer_date: string;
  valid_until: string | null;
  general_discount: number;
  discount_mode: "general" | "per_product";
  notes: string | null;
  payment_terms: string | null;
  shipping_information: string | null;
  additional_notes: string | null;
  total: number;
  status: string;
  created_at: string;
  updated_at: string;
  offer_items: OfferItem[];
};

export type AppUser = { id: string; email: string; name?: string };

export type FixedInformation = {
  contact_person: string;
  contact_number: string;
  notes: string;
};

export type ProductFormValue = {
  name: string;
  composition: string;
  package_type: string;
  package_detail: string;
  hna: string;
  tax_percentage: string;
};

export type OfferDraft = {
  recipient_name: string;
  institution: string;
  contact_person: string;
  contact_number: string;
  offer_date: string;
  valid_until: string;
  general_discount: number;
  discount_mode: "general" | "per_product";
  notes: string;
  payment_terms: string;
  shipping_information: string;
  additional_notes: string;
  selected: Record<string, { quantity: number; discount: number }>;
};

export type MedicationTemplate = {
  id: string;
  name: string;
  items: string[];
};
