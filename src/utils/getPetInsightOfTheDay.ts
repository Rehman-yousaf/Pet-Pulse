/**
 * Pet Insight of the Day — rule-based, deterministic by date (same insight per day).
 */

import type { Pet } from '@/src/services/petService';

export interface PetInsight {
  icon: string;
  message: string;
  route: string;
  petId?: string;
}

const STATIC_TIPS: { message: string; icon: string; route: string }[] = [
  { message: 'Consistent meal timing improves digestion 🍽️', icon: 'restaurant', route: '/tabs' },
  { message: 'Regular play improves mood and sleep quality 🧠', icon: 'heart', route: '/tabs' },
  { message: 'Add a pet to get personalized care insights 🐾', icon: 'paw', route: '/tabs' },
  { message: "Quick health logs help track your pet's wellness 📋", icon: 'document-text-outline', route: '/tabs' },
  { message: 'Upcoming vet visit? Prepare notes in Vet overview 🏥', icon: 'medical', route: '/tabs' },
];

function getContextualInsight(pet: Pet): PetInsight {
  const name = pet.name;
  const dayIndex = new Date().getDate() % 5;

  const options: PetInsight[] = [
    { icon: 'walk', message: `${name} might enjoy a short walk today 🐾`, route: '/tabs', petId: pet.id },
    { icon: 'restaurant', message: `Track meals for ${name} to keep them thriving 🍽️`, route: '/tabs', petId: pet.id },
    { icon: 'medical', message: `Next vaccine for ${name}? Check their profile 💉`, route: '/tabs', petId: pet.id },
    { icon: 'medical-outline', message: `Medication reminders help ${name} stay on track 💊`, route: '/tabs', petId: pet.id },
    { icon: 'heart', message: `Regular check-ins keep ${name} happy and healthy 🧠`, route: '/tabs', petId: pet.id },
  ];
  return options[dayIndex];
}

/**
 * Returns the Pet Insight of the Day (deterministic by date).
 */
export function getPetInsightOfTheDay(pets: Pet[] | null): PetInsight {
  if (pets && pets.length > 0) {
    return getContextualInsight(pets[0]);
  }
  const dayIndex = new Date().getDate() % STATIC_TIPS.length;
  const tip = STATIC_TIPS[dayIndex];
  return { icon: tip.icon, message: tip.message, route: tip.route };
}
