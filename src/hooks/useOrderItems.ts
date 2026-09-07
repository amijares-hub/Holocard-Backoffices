import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface OrderItem {
    id?: string;
    product_id?: string;
    title: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image_url?: string;
}

export const useOrderItems = (order: any) => {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchItems = async () => {
            if (!order?.id) {
                setItems([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // 1. Consultar registros de order_items
                const { data: dbItems, error: dbError } = await supabase
                    .from('order_items')
                    .select('*')
                    .eq('order_id', order.id);

                if (!dbError && dbItems && dbItems.length > 0) {
                    // Extraer IDs de productos
                    const productIds = dbItems
                        .map((item: any) => item.product_id || item.item_id)
                        .filter(Boolean);

                    // 2. Traer la información del catálogo de productos en paralelo
                    let productsMap: Record<string, any> = {};

                    if (productIds.length > 0) {
                        const { data: productsData } = await supabase
                            .from('products')
                            .select('*')
                            .in('id', productIds);

                        (productsData || []).forEach((p: any) => {
                            productsMap[p.id] = p;
                        });
                    }

                    if (isMounted) {
                        const mappedItems = dbItems.map((item: any) => {
                            const prodId = item.product_id || item.item_id;
                            const prod = productsMap[prodId] || {};

                            // Resolver nombre/título
                            const title = item.title || item.name || item.product_name || prod.name || prod.title || 'Producto sin nombre';

                            // Resolver precio unitario
                            const unitPrice = Number(
                                item.price_at_time_of_purchase ??
                                item.price_at_purchase ??
                                item.unit_price ??
                                item.price ??
                                prod.base_price ??
                                prod.price ??
                                0
                            );

                            const qty = Number(item.quantity) || 1;
                            const totalPrice = Number(item.total_price) || (unitPrice * qty);
                            const imageUrl = item.image_url || item.image || prod.image_url || prod.image;

                            return {
                                id: item.id,
                                product_id: prodId,
                                title,
                                quantity: qty,
                                unit_price: unitPrice,
                                total_price: totalPrice,
                                image_url: imageUrl
                            };
                        });

                        setItems(mappedItems);
                        setLoading(false);
                    }
                    return;
                }

                // 3. Fallback para datos almacenados en formato JSONB dentro del objeto order
                const rawJsonItems = order.items || order.products || order.order_items || order.payload?.items;

                if (rawJsonItems) {
                    const parsedItems = typeof rawJsonItems === 'string'
                        ? JSON.parse(rawJsonItems)
                        : rawJsonItems;

                    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
                        if (isMounted) {
                            setItems(parsedItems.map((item: any, idx: number) => ({
                                id: item.id || `json-${idx}`,
                                product_id: item.product_id || item.id,
                                title: item.title || item.name || item.product_name || 'Producto en pedido',
                                quantity: Number(item.quantity || item.qty) || 1,
                                unit_price: Number(item.price || item.unit_price || item.price_at_time_of_purchase) || 0,
                                total_price: Number(item.total_price) || ((Number(item.quantity || item.qty) || 1) * (Number(item.price || item.unit_price) || 0)),
                                image_url: item.image_url || item.image || item.icon
                            })));
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (isMounted) {
                    setItems([]);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('Error procesando artículos del pedido:', err);
                if (isMounted) {
                    setError(err.message);
                    setItems([]);
                    setLoading(false);
                }
            }
        };

        fetchItems();

        return () => {
            isMounted = false;
        };
    }, [order?.id, order?.items, order?.products]);

    return { items, loading, error };
};