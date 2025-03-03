/**
 * Formatea un número como moneda (USD)
 * @param {number} amount - La cantidad a formatear
 * @returns {string} La cantidad formateada como moneda
 */
export const formatCurrency = (amount) => {
    const formatter = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    });
    
    return formatter.format(amount);
  };
  
  /**
   * Formatea una fecha en formato largo
   * @param {Date|string} date - La fecha a formatear
   * @returns {string} La fecha formateada
   */
  export const formatLongDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  /**
   * Formatea una fecha en formato corto
   * @param {Date|string} date - La fecha a formatear
   * @returns {string} La fecha formateada
   */
  export const formatShortDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return dateObj.toLocaleDateString('es-ES');
  };