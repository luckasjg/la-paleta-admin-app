import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useShopSetting } from '@/lib/useShopSetting';
import { LOYALTY_KEY, parseRules } from '@/lib/loyalty';
import { loadAllEntries, computeStanding } from '@/lib/loyaltyStandings';

// Avance de fidelización de todos los clientes con consumo: { standings: {id: standing}, customers: {id: customer} }
export function useLoyaltyStandings() {
  const { value, isLoading: loadingRules } = useShopSetting(LOYALTY_KEY);
  return useQuery({
    queryKey: ['loyalty_standings', value],
    enabled: !loadingRules,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rules = parseRules(value);
      const { entries, redeemed } = await loadAllEntries();
      const ids = Object.keys(entries);
      const standings = {};
      ids.forEach(id => { standings[id] = computeStanding(entries[id], rules, redeemed[id] || 0); });
      const customers = {};
      for (let i = 0; i < ids.length; i += 200) {
        const page = await base44.entities.Customer.filter({ id: { $in: ids.slice(i, i + 200) } }, { limit: 200 });
        page.items.forEach(c => { customers[c.id] = c; });
      }
      return { standings, customers };
    },
  });
}