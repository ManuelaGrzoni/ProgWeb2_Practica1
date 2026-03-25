export class CartStore {
  items = $state([]); // [ { producto, cantidad } ]

  constructor() {
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
       const saved = localStorage.getItem('cart_items');
       if (saved) {
         try { 
           this.items = JSON.parse(saved); 
         } catch (e) { 
           console.error("Error loading cart", e); 
         }
       }
    }
  }

  saveToStorage() {
    if (typeof localStorage !== 'undefined') {
       localStorage.setItem('cart_items', JSON.stringify(this.items));
    }
  }

  agregar(producto) {
    const existing = this.items.find(item => item.producto._id === producto._id);
    if (existing) {
      existing.cantidad += 1;
    } else {
      this.items.push({ producto, cantidad: 1 });
    }
    this.saveToStorage();
  }

  quitar(id) {
    this.items = this.items.filter(item => item.producto._id !== id);
    this.saveToStorage();
  }

  actualizarCantidad(id, cant) {
    const existing = this.items.find(item => item.producto._id === id);
    if (existing) {
      existing.cantidad = Math.max(1, cant);
      this.saveToStorage();
    }
  }

  vaciar() {
    this.items = [];
    this.saveToStorage();
  }

  get totalItems() {
     return this.items.reduce((sum, item) => sum + item.cantidad, 0);
  }

  get totalPrice() {
     return this.items.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
  }
}

export const cartStore = new CartStore();
