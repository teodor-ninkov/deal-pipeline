import { Deal, Stage, Score } from "../types";
import { uid, today, addDays } from "../lib/ids";

interface Seed {
  customer: string; email: string; phone: string; vehicle: string; origin: string; destination: string;
  pickup: number; price: number; score: Score; stage: Stage; agent: string; followUp: number; created: number;
  notes: string[];
}

const seeds: Seed[] = [
  { customer: "Michael Turner", email: "m.turner@example.com", phone: "(305) 555-0142", vehicle: "2019 Honda Civic", origin: "Miami, FL", destination: "Chicago, IL", pickup: 6, price: 1150, score: "Hot", stage: "negotiating", agent: "Teodor Ninkov", followUp: 0, created: -2, notes: ["Ready to book today, wants pickup Monday", "Quoted $1,150 open transport, competitor offered $1,090"] },
  { customer: "Jennifer Lopez", email: "jen.lopez@example.com", phone: "(602) 555-0123", vehicle: "2021 Ford F-150", origin: "Phoenix, AZ", destination: "Atlanta, GA", pickup: 3, price: 1480, score: "Hot", stage: "quoted", agent: "Maria Petrova", followUp: -1, created: -3, notes: ["Auction purchase, needs pickup this week"] },
  { customer: "James Anderson", email: "j.anderson@example.com", phone: "(214) 555-0134", vehicle: "2020 Jeep Wrangler + 2018 Honda Accord", origin: "Dallas, TX", destination: "Portland, OR", pickup: 4, price: 2890, score: "Hot", stage: "booked", agent: "Teodor Ninkov", followUp: 2, created: -5, notes: ["Two vehicles, same carrier", "Booked with dispatch, pickup Friday"] },
  { customer: "Christopher Brown", email: "chris.brown@example.com", phone: "(313) 555-0111", vehicle: "1967 Ford Mustang", origin: "Detroit, MI", destination: "San Diego, CA", pickup: 40, price: 2650, score: "Hot", stage: "quoted", agent: "Sophie Chen", followUp: 1, created: -4, notes: ["Enclosed only, classic car", "Sent enclosed quote $2,650"] },
  { customer: "David Kim", email: "dkim@example.com", phone: "(206) 555-0177", vehicle: "2022 Tesla Model Y", origin: "Seattle, WA", destination: "Denver, CO", pickup: 50, price: 1320, score: "Warm", stage: "quoted", agent: "Alex Johnson", followUp: 3, created: -6, notes: ["Comparing quotes, December move"] },
  { customer: "Emily Davis", email: "emily.d@example.com", phone: "(617) 555-0189", vehicle: "2016 Toyota Corolla", origin: "Boston, MA", destination: "Orlando, FL", pickup: 90, price: 1090, score: "Warm", stage: "new", agent: "Maria Petrova", followUp: 7, created: -1, notes: ["Daughter's car for college, January, flexible"] },
  { customer: "Sarah Collins", email: "sarah.collins@example.com", phone: "(512) 555-0198", vehicle: "Unknown", origin: "Texas", destination: "California", pickup: 0, price: 0, score: "Cold", stage: "new", agent: "Alex Johnson", followUp: 4, created: -1, notes: ["Asked for a price only, no vehicle details yet"] },
  { customer: "Linda Martinez", email: "linda.m@example.com", phone: "(702) 555-0156", vehicle: "Unknown", origin: "Las Vegas, NV", destination: "New York, NY", pickup: 150, price: 0, score: "Cold", stage: "new", agent: "Teodor Ninkov", followUp: 10, created: 0, notes: ["Spring move, just browsing"] },
  { customer: "Robert Wilson", email: "rwilson@example.com", phone: "(718) 555-0165", vehicle: "Unknown", origin: "", destination: "", pickup: 0, price: 0, score: "Cold", stage: "lost", agent: "Sophie Chen", followUp: -5, created: -12, notes: ["No reply after two follow-ups"] },
  { customer: "Patricia Moore", email: "p.moore@example.com", phone: "(415) 555-0150", vehicle: "2023 BMW X5", origin: "San Francisco, CA", destination: "Austin, TX", pickup: -8, price: 1740, score: "Hot", stage: "delivered", agent: "Maria Petrova", followUp: -3, created: -20, notes: ["Enclosed transport", "Delivered on time, 5-star review"] },
  { customer: "Kevin Nguyen", email: "k.nguyen@example.com", phone: "(503) 555-0170", vehicle: "2017 Subaru Outback", origin: "Portland, OR", destination: "Nashville, TN", pickup: 12, price: 1390, score: "Warm", stage: "negotiating", agent: "Alex Johnson", followUp: -2, created: -7, notes: ["Wants $1,300, we are at $1,390", "Offered to split the difference"] },
  { customer: "Angela Scott", email: "a.scott@example.com", phone: "(404) 555-0172", vehicle: "2015 Nissan Altima", origin: "Atlanta, GA", destination: "Newark, NJ", pickup: 2, price: 820, score: "Hot", stage: "booked", agent: "Sophie Chen", followUp: 1, created: -3, notes: ["Dealer client, repeat customer"] },
  { customer: "Brian Hall", email: "b.hall@example.com", phone: "(312) 555-0188", vehicle: "2020 Chevrolet Silverado", origin: "Chicago, IL", destination: "Houston, TX", pickup: 20, price: 1210, score: "Warm", stage: "quoted", agent: "Teodor Ninkov", followUp: 0, created: -4, notes: ["Needs a quote update after date change"] },
  { customer: "Megan Clark", email: "megan.c@example.com", phone: "(720) 555-0109", vehicle: "2019 Mazda CX-5", origin: "Denver, CO", destination: "Phoenix, AZ", pickup: 9, price: 690, score: "Warm", stage: "new", agent: "Maria Petrova", followUp: 1, created: 0, notes: ["Came in via website form this morning"] }
];

export function sampleDeals(): Deal[] {
  const base = today();
  return seeds.map(s => {
    const created = new Date(addDays(base, s.created) + "T09:30:00").toISOString();
    return {
      id: uid(),
      customer: s.customer,
      email: s.email,
      phone: s.phone,
      vehicle: s.vehicle,
      origin: s.origin,
      destination: s.destination,
      pickupDate: s.pickup ? addDays(base, s.pickup) : "",
      price: s.price,
      score: s.score,
      stage: s.stage,
      agent: s.agent,
      followUp: addDays(base, s.followUp),
      createdAt: created,
      activities: s.notes.map((text, i) => ({
        id: uid(),
        type: i === 0 ? ("note" as const) : ("call" as const),
        text,
        at: new Date(addDays(base, s.created + i) + "T11:00:00").toISOString()
      }))
    };
  });
}
