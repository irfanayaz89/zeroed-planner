/** Pick an emoji for a block from its title, so the ribbon is visual by default. */
const RULES: [RegExp, string][] = [
  [/\b(chem|lab|experiment)/i, "🧪"],
  [/\b(physics|math|maths|calc|algebra)/i, "📐"],
  [/\b(study|revise|revision|homework|notes|exam|paper|flashcard)/i, "📚"],
  [/\b(read|book|chapter|pages)/i, "📖"],
  [/\b(write|essay|draft|journal)/i, "✍️"],
  [/\b(code|coding|bug|deploy|build)/i, "💻"],
  [/\b(email|emails|admin|forms|inbox|bills?)/i, "📮"],
  [/\b(call|phone|ring)/i, "📞"],
  [/\b(meet|meeting|standup|sync)/i, "👥"],
  [/\b(gym|lift|legs|weights|workout)/i, "🏋️"],
  [/\b(run|jog|walk|steps)/i, "🏃"],
  [/\b(yoga|stretch)/i, "🧘"],
  [/\b(swim)/i, "🏊"],
  [/\b(bike|cycle|cycling)/i, "🚲"],
  [/\b(guitar|piano|music|practice|song)/i, "🎸"],
  [/\b(draw|paint|sketch|design)/i, "🎨"],
  [/\b(meditat|breath|mindful)/i, "🌿"],
  [/\b(cook|dinner|lunch|breakfast|meal|eat)/i, "🍲"],
  [/\b(shop|groceries|buy)/i, "🛒"],
  [/\b(clean|tidy|laundry|dishes|hoover|vacuum)/i, "🧺"],
  [/\b(doctor|dentist|gp|appointment)/i, "🩺"],
  [/\b(class|lecture|school|college|uni)/i, "🏫"],
  [/\b(sleep|bed|wind[- ]?down)/i, "🌙"],
  [/\b(morning|wake)/i, "🌅"],
  [/\b(friend|family|mum|dad|party)/i, "💬"],
];

export function guessIcon(title: string): string {
  for (const [re, icon] of RULES) if (re.test(title)) return icon;
  return "✳️";
}

export const ICON_CHOICES = ["📚", "🧪", "📐", "📖", "✍️", "💻", "📮", "📞", "🏋️", "🏃", "🧘", "🎸", "🎨", "🌿", "🍲", "🧺", "🛒", "🩺", "🌙", "✳️"];
