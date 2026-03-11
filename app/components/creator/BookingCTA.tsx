type BookingCTAProps = {
    phone: string;
    creatorName: string;
  };
  
  export default function BookingCTA({
    phone,
    creatorName,
  }: BookingCTAProps) {
    const message = encodeURIComponent(
      `Hello ${creatorName}, I found your profile and I would like to book your services.`
    );
  
    const whatsappLink = `https://wa.me/${phone}?text=${message}`;
  
    return (
      <div className="my-6 flex justify-center">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-green-500 px-6 py-3 text-white font-semibold hover:bg-green-600"
        >
          Book via WhatsApp
        </a>
      </div>
    );
  }
  