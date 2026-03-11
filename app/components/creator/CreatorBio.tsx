type CreatorBioProps = {
    bio: string;
    categories: string[];
    location: string;
    services: string[];
  };
  
  export default function CreatorBio({
    bio,
    categories,
    location,
    services,
  }: CreatorBioProps) {
    function bookService(service: string) {
        const message = encodeURIComponent(
          `Hello, I’m interested in your service: ${service}. Please share pricing and availability.`
        );
      
        window.open(`https://wa.me/237XXXXXXXXX?text=${message}`, "_blank");
      }
      
    
    return (
      <div className="creator-bio space-y-4">
        {/* BIO */}
        <p className="text-sm text-gray-700">{bio}</p>
  
        {/* CATEGORIES */}
        <div>
          <h4 className="font-semibold text-sm mb-1">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
  
        {/* SERVICES */}
        <div>
          <h4 className="font-semibold text-sm mb-1">Services</h4>
          <ul className="list-disc pl-4 text-sm text-gray-700">
            {services.map((service) => (
              <li
              onClick={() => bookService(service)}
              className="cursor-pointer rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
            >
              {service}
            </li>
            
            ))}
          </ul>
        </div>
  
        {/* LOCATION */}
        <div className="text-sm text-gray-600">
          📍 {location}
        </div>
      </div>
    );
  }
  