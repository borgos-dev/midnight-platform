export function openWhatsApp(
    phone: string,
    message: string
  ) {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }
  