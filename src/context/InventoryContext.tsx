import React, { createContext, useContext, useMemo } from 'react';
import { IInventoryRepository } from '../domain/repositories/inventory-repository.interface';
import { createInventoryRepository } from '../infrastructure/storage/inventory-repository-factory';

interface InventoryContextType {
  repository: IInventoryRepository;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export interface InventoryProviderProps {
  children: React.ReactNode;
  repository?: IInventoryRepository;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({
  children,
  repository,
}) => {
  const repoInstance = useMemo(
    () => repository ?? createInventoryRepository(),
    [repository]
  );

  return (
    <InventoryContext.Provider value={{ repository: repoInstance }}>
      {children}
    </InventoryContext.Provider>
  );
};

export function useInventoryRepository(): IInventoryRepository {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryRepository debe ser utilizado dentro de un InventoryProvider');
  }
  return context.repository;
}

