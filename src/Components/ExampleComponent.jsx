import React, { useState, useEffect } from 'react';
import { beeldbankApi } from '../services/api';

function ExampleComponent() {
  const [beeldbanken, setBeeldbanken] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    //console.log("examplecomponent regel 10 fetchData")
    const fetchData = async () => {
      try {
        const data = await beeldbankApi.getAll();
        setBeeldbanken(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleUpload = async (event) => {
    const formData = new FormData();
    const files = event.target.files;
    
    Array.from(files).forEach((file) => {
      formData.append('images[]', file);
    });

    try {
      const response = await beeldbankApi.uploadImages(formData);
      const result = await response.json();
      // console.log('Upload successful:', result);
      // Handle successful upload
    } catch (err) {
      console.error('Upload failed:', err);
      // Handle error
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Beeldbanken</h1>
      <ul>
        {beeldbanken.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      
      <div>
        <h2>Upload Images</h2>
        <input type="file" multiple onChange={handleUpload} />
      </div>
    </div>
  );
}

export default ExampleComponent;
