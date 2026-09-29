import SizeAdderForm from "./SizeAdderForm";
import SizesTable from "./SizesTable";
import "./SizesSection.css";

export default function SizesSection({ productId, types, sizes, recipeBySize, costBySize, canManage, onReload }) {
  return (
    <div className="sizes-section">
      <SizeAdderForm productId={productId} types={types} canManage={canManage} onReload={onReload} />
      {types.length === 0 && <p className="details-empty">أضف نوعًا أولًا ثم أضف الأحجام.</p>}
      <SizesTable
        productId={productId}
        types={types}
        sizes={sizes}
        recipeBySize={recipeBySize}
        costBySize={costBySize}
        canManage={canManage}
        onReload={onReload}
      />
    </div>
  );
}