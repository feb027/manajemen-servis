import React, { useState } from 'react';

function ServiceOrderForm() {
  const [formData, setFormData] = useState({
    customerName: '',
    customerContact: '',
    deviceType: '',
    brandModel: '',
    serialNumber: '',
    customerComplaint: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implementasikan logika penyimpanan data ke Supabase di sini
    // Contoh:
    // import { supabase } from '../supabase/supabaseClient';
    // const { data, error } = await supabase
    //   .from('service_orders') // Ganti 'service_orders' dengan nama tabel Anda
    //   .insert([formData]);
    console.log('Form Data:', formData);
    // Reset form setelah submit (opsional)
    // setFormData({ ...initial state... });
    alert('Order berhasil disimpan (placeholder)!'); // Placeholder
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Catat Order Servis Baru</h2>

      <div>
        <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
        <input
          type="text"
          id="customerName"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="customerContact" className="block text-sm font-medium text-gray-700">Kontak Pelanggan (Telepon/Email)</label>
        <input
          type="text"
          id="customerContact"
          name="customerContact"
          value={formData.customerContact}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700">Jenis Perangkat</label>
        <select
          id="deviceType"
          name="deviceType"
          value={formData.deviceType}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Pilih Jenis Perangkat</option>
          <option value="Laptop">Laptop</option>
          <option value="PC">PC (Desktop)</option>
          <option value="Printer">Printer</option>
          <option value="Monitor">Monitor</option>
          <option value="Lainnya">Lainnya</option>
        </select>
      </div>

      <div>
        <label htmlFor="brandModel" className="block text-sm font-medium text-gray-700">Merk / Model</label>
        <input
          type="text"
          id="brandModel"
          name="brandModel"
          value={formData.brandModel}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700">Nomor Seri (Opsional)</label>
        <input
          type="text"
          id="serialNumber"
          name="serialNumber"
          value={formData.serialNumber}
          onChange={handleChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="customerComplaint" className="block text-sm font-medium text-gray-700">Keluhan Pelanggan</label>
        <textarea
          id="customerComplaint"
          name="customerComplaint"
          rows="4"
          value={formData.customerComplaint}
          onChange={handleChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        ></textarea>
      </div>

      <div>
        <button
          type="submit"
          className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Simpan Order
        </button>
      </div>
    </form>
  );
}

export default ServiceOrderForm; 