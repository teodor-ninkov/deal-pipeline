export type Stage = "new" | "quoted" | "negotiating" | "booked" | "delivered" | "lost";
export type Score = "Hot" | "Warm" | "Cold";
export type ActivityType = "note" | "call" | "email" | "stage";

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  at: string;
}

export interface Deal {
  id: string;
  customer: string;
  email: string;
  phone: string;
  vehicle: string;
  origin: string;
  destination: string;
  pickupDate: string;
  price: number;
  score: Score;
  stage: Stage;
  agent: string;
  followUp: string;
  createdAt: string;
  activities: Activity[];
}

export interface Filters {
  search: string;
  agent: string;
  scores: Score[];
  overdueOnly: boolean;
}

export const STAGES: { id: Stage; label: string; open: boolean }[] = [
  { id: "new", label: "New", open: true },
  { id: "quoted", label: "Quoted", open: true },
  { id: "negotiating", label: "Negotiating", open: true },
  { id: "booked", label: "Booked", open: false },
  { id: "delivered", label: "Delivered", open: false },
  { id: "lost", label: "Lost", open: false }
];

export const SCORES: Score[] = ["Hot", "Warm", "Cold"];
export const AGENTS = ["Teodor Ninkov", "Maria Petrova", "Alex Johnson", "Sophie Chen"];
