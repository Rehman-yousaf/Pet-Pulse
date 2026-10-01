/**
 * Random pet care quotes for Daily Paw Insight.
 */

const PET_QUOTES = [
  'A healthy pet is a happy pet 🐾',
  'Small paws, big love.',
  'Regular vet visits save lives.',
  'Medication today means playtime tomorrow.',
  'Hydration is love.',
  'Vaccines protect wagging tails.',
  'Care today, cuddles forever.',
  'Every pet deserves a healthy tomorrow.',
  'Love them well, vet them well.',
  'A fed pet is a happy pet.',
  'Prevention is the best medicine.',
  'Keep them safe, keep them vaccinated.',
  'Your vet is your pet’s best friend.',
  'Healthy diet, happy life.',
  'Routine care = more years together.',
  'Small steps today, big health tomorrow.',
  'They give us everything; we give them care.',
  'Stay on schedule, stay on track.',
  'Wellness checks keep tails wagging.',
  'Good care is the best love.',
];

export function getRandomPetQuote(): string {
  return PET_QUOTES[Math.floor(Math.random() * PET_QUOTES.length)];
}
