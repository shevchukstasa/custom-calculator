import { useState, useEffect } from 'react';
import { StoneEntry, ProductType } from '../types';
import {
  getRecentStoneEntries,
  addStoneEntry,
  deleteStoneEntry,
} from '../utils/stoneDatabase';

interface StoneDatabaseProps {
  onSelectStone?: (stone: StoneEntry) => void;
  currentProductType?: ProductType;
}

export function StoneDatabase({ onSelectStone, currentProductType }: StoneDatabaseProps) {
  const [stones, setStones] = useState<StoneEntry[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newStone, setNewStone] = useState({
    name: '',
    pricePerUnit: '',
    pricePerM2: '',
    productType: currentProductType || 'tile' as ProductType,
    sizeRange: '',
    thickness: '',
  });

  useEffect(() => {
    loadStones();
  }, []);

  const loadStones = () => {
    const db = getRecentStoneEntries(20);
    setStones(db);
  };

  const handleAddStone = () => {
    if (!newStone.name || !newStone.pricePerUnit || !newStone.pricePerM2) {
      alert('Please fill in all required fields');
      return;
    }

    const entry = addStoneEntry({
      name: newStone.name,
      pricePerUnit: parseFloat(newStone.pricePerUnit),
      pricePerM2: parseFloat(newStone.pricePerM2),
      productType: newStone.productType,
      sizeRange: newStone.sizeRange || undefined,
      thickness: newStone.thickness ? parseFloat(newStone.thickness) : undefined,
    });

    setStones([entry, ...stones]);
    setIsAddingNew(false);
    setNewStone({
      name: '',
      pricePerUnit: '',
      pricePerM2: '',
      productType: currentProductType || 'tile',
      sizeRange: '',
      thickness: '',
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this entry?')) {
      deleteStoneEntry(id);
      loadStones();
    }
  };

  return (
    <div className="stone-database">
      <div className="stone-database-header">
        <h3>Stone Database</h3>
        <button
          type="button"
          className="button-secondary"
          onClick={() => setIsAddingNew(!isAddingNew)}
        >
          {isAddingNew ? 'Cancel' : '+ Add Stone'}
        </button>
      </div>

      {isAddingNew && (
        <div className="stone-form">
          <div className="input-group">
            <label>Stone Name *</label>
            <input
              type="text"
              value={newStone.name}
              onChange={(e) => setNewStone({ ...newStone, name: e.target.value })}
              placeholder="Example: White Clay"
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Price per unit (mil Rp) *</label>
              <input
                type="number"
                step="0.01"
                value={newStone.pricePerUnit}
                onChange={(e) =>
                  setNewStone({ ...newStone, pricePerUnit: e.target.value })
                }
                placeholder="1.095"
              />
            </div>

            <div className="input-group">
              <label>Price per m² (mil Rp) *</label>
              <input
                type="number"
                step="0.01"
                value={newStone.pricePerM2}
                onChange={(e) => setNewStone({ ...newStone, pricePerM2: e.target.value })}
                placeholder="1.19"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Product Type</label>
              <select
                value={newStone.productType}
                onChange={(e) =>
                  setNewStone({ ...newStone, productType: e.target.value as ProductType })
                }
              >
                <option value="tile">Tile</option>
                <option value="countertop">Countertop</option>
                <option value="sink">Sink</option>
                <option value="3d">3D</option>
              </select>
            </div>

            <div className="input-group">
              <label>Size Range (optional)</label>
              <input
                type="text"
                value={newStone.sizeRange}
                onChange={(e) => setNewStone({ ...newStone, sizeRange: e.target.value })}
                placeholder="10x10-20x20"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Thickness (cm, optional)</label>
              <input
                type="number"
                step="0.1"
                min="0.3"
                value={newStone.thickness}
                onChange={(e) => setNewStone({ ...newStone, thickness: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>

          <button type="button" className="button" onClick={handleAddStone}>
            Save
          </button>
        </div>
      )}

      <div className="stone-list">
        {stones.length === 0 ? (
          <p className="empty-state">
            Database is empty. Add the first stone.
          </p>
        ) : (
          <table className="stone-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price/pcs (mil Rp)</th>
                <th>Price/m² (mil Rp)</th>
                <th>Type</th>
                <th>Sizes</th>
                <th>Thickness</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stones.map((stone) => (
                <tr key={stone.id}>
                  <td>{stone.name}</td>
                  <td>{stone.pricePerUnit.toFixed(3)}</td>
                  <td>{stone.pricePerM2.toFixed(2)}</td>
                  <td>{stone.productType || '-'}</td>
                  <td>{stone.sizeRange || '-'}</td>
                  <td>{stone.thickness ? `${stone.thickness} cm` : '-'}</td>
                  <td>
                    {onSelectStone && (
                      <button
                        type="button"
                        className="button-small"
                        onClick={() => onSelectStone(stone)}
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      className="button-small button-danger"
                      onClick={() => handleDelete(stone.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
