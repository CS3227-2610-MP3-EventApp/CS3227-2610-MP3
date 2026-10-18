export const roles = ["Attendee", "Organiser", "Business"] as const;

export const homes = {
  attendee: ["Browse Programme", "My Itinerary", "Event Assistant"],
  organiser: ["Programme Management", "Application Reviews", "AI Application Analysis"],
  business: ["Applications", "Preparation & Budget", "AI Preparation Draft"],
} as const;
