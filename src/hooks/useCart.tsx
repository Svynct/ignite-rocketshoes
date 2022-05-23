import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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

  async function verifyProductStock(productId: number, amount: number) {
    const stock = await api.get<Stock>(`stock/${productId}`);

    if (stock.status >= 400) {
      throw new Error("Product not found");
    }

    return amount <= stock.data.amount;
  }

  const addProduct = async (productId: number) => {
    try {
      const productIsAlreadyOnCart = cart.find(product => product.id === productId);

      const amount = productIsAlreadyOnCart ? productIsAlreadyOnCart.amount + 1 : 1;

      const productHasStock = await verifyProductStock(productId, amount);

      if (!productHasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let newCart: Product[] = [];

      if (productIsAlreadyOnCart) {
        newCart = cart.map(product => {
          if (product.id === productId) {
            product.amount++;
          }
          return product;
        })
      } else {
        const product = await api.get<Product>(`products/${productId}`);
        product.data.amount = 1;
        newCart = [...cart, product.data];
      }
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);

      if (!product) {
        throw new Error("Product not found");
      }

      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (!amount) {
      return;
    }

    try {
      const productHasStock = await verifyProductStock(productId, amount);

      if (!productHasStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        }
        return product;
      })

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
