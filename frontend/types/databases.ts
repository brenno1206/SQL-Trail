import type { IconType } from 'react-icons';
import { FaDatabase, IoMdPeople, IoMdSchool } from '@/assets/icons';

/**
 * Ícones dos cenários conhecidos. A lista de cenários vem da API (/scenarios);
 * cenários sem ícone específico usam o ícone genérico de banco de dados.
 */
const scenarioIcons: Record<string, IconType> = {
  'recursos-humanos': IoMdPeople,
  universidade: IoMdSchool,
};

export function getScenarioIcon(slug: string): IconType {
  return scenarioIcons[slug] || FaDatabase;
}

/** Caminho da imagem do diagrama do cenário */
export function getDiagramUrl(scenario: {
  slug: string;
  diagram_url?: string;
}) {
  return scenario.diagram_url || `/${scenario.slug}.png`;
}
