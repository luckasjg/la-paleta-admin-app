import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import FixedCostsConfig, { DEFAULT_FIXED_COSTS } from '@/components/profitability/FixedCostsConfig';
import ProfitabilityMatrix from '@/components/profitability/ProfitabilityMatrix';

const STORAGE_KEY = 'profitability_fixed_costs_v1';

const loadFixedCosts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FIXED_COSTS;
    return { ...DEFAULT_FIXED_COSTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FIXED_COSTS;
  }
};

export default function ProfitabilityAnalysis() {
  const [fixedCosts, setFixedCosts] = useState(loadFixedCosts);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fixedCosts));
    } catch {
      // ignore
    }
  }, [fixedCosts]);

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => base44.entities.Supply.list(),
  });

  const fixedServiceCosts = Object.values(fixedCosts).reduce(
    (s, v) => s + (parseFloat(v) || 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Análisis de Rentabilidad"
        description="Matriz de aporte neto por sabor × presentación, con costos fijos editables"
      />

      <FixedCostsConfig values={fixedCosts} onChange={setFixedCosts} />

      <ProfitabilityMatrix
        recipes={recipes}
        products={products}
        supplies={supplies}
        fixedServiceCosts={fixedServiceCosts}
      />
    </div>
  );
}