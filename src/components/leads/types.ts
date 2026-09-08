export type LeadEventDTO = {
  id: string;
  type: string;
  body: string;
  createdAt: string;
};

export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string;
  notes: string;
  createdAt: string;
  lastContactAt: string;
  assignedTo: string | null;
  salesCount: number;
  events: LeadEventDTO[];
};

export type ProductDTO = {
  id: string;
  name: string;
  basePrice: number;
  category: string;
};
