import Link from 'next/link';
import {
  IoIosAirplane,
  IoMdPeople,
  IoMdSchool,
  IoIosCart,
} from '@/assets/icons';

interface DatabaseCardProps {
  slug: string;
  title: string;
}

const iconMap = {
  'companhia-aerea': IoIosAirplane,
  'recursos-humanos': IoMdPeople,
  universidade: IoMdSchool,
  'e-commerce': IoIosCart,
};
const DefaultIcon = IoMdPeople;

export default function DatabaseCard({ slug, title }: DatabaseCardProps) {
  const IconComponent = iconMap[slug as keyof typeof iconMap] || DefaultIcon;
  return (
    <Link
      href={`/${slug}`}
      className="group flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg shadow-md border border-gray-200 transition-all duration-300 hover:shadow-xl hover:bg-blue-50 hover:-translate-y-1"
    >
      <IconComponent className="text-4xl text-blue-700 mb-4 transition-colors group-hover:text-blue800" />
      <h3 className="text-xl font-semibold text-gray-700 group-hover:text-blue-800">
        {title}
      </h3>
    </Link>
  );
}
