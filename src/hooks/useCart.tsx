import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);
      const stock = await api.get<Stock>(`stock/${productId}`);
      const current = productExists ? productExists.amount : 0;

      if (stock.data.amount < current) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        const mapProduct = cart.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount: current + 1,
            };
          }
          return product;
        });

        setCart(mapProduct);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(mapProduct));
      } else {
        const result = await api.get<Product>(`products/${productId}`);
        const newProduct = [...cart, { ...result.data, amount: 1 }];
        setCart(newProduct);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newProduct));
      }
    } catch (err) {
      toast.error("Erro ao adicionar o produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);
      if (productExists) {
        const filterProducts = cart.filter(
          (product) => product.id !== productId
        );
        setCart(filterProducts);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(filterProducts)
        );
      }
    } catch {
      toast.error("Erro ao remover o produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const product = cart.find((product) => product.id === productId);
      if (product) {
        const stock = await api.get<Stock>(`stock/${productId}`);
        if (amount > stock.data.amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        product.amount = amount;
        setCart([...cart]);
        toast.success("Quantidade atualizada com sucesso!");
      }
    } catch {
      toast.error("Erro ao atualizar a quantidade");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
