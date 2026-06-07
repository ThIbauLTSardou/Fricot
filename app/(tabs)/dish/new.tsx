import { useRouter } from "expo-router";
import { DishForm, DishFormValues } from "@/components/DishForm";
import { useDishStore } from "@/store/useDishStore";

export default function NewDishScreen() {
  const router = useRouter();
  const addDish = useDishStore((s) => s.addDish);

  const handleSubmit = async (values: DishFormValues) => {
    await addDish(values);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return <DishForm submitLabel="Enregistrer le plat" onSubmit={handleSubmit} />;
}
