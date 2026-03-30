import React, { useState } from 'react';
import axios from 'axios';
import { config } from '../config';

const UploadFiles = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    setFiles(event.target.files);
  };

  const handleUpload = () => {
    setUploading(true);
    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }
    // console.log(formData.get('images'));

    axios.post(`${config.API_BASE || window.location.origin}/api/upload`, formData)
      .then((response) => {
        // console.log(response.data);
        setUploading(false);
      })
      .catch((error) => {
        console.error(error);
        setUploading(false);
      });
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload Images'}
      </button>
    </div>
  );
};

export default UploadFiles;