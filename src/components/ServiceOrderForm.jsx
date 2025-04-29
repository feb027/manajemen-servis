import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { FiX, FiUser, FiPhone, FiSmartphone, FiPrinter, FiMonitor, FiPackage, FiTag, FiAlignLeft, FiLoader, FiCheckCircle, FiAlertTriangle, FiPlusCircle, FiDollarSign } from 'react-icons/fi';
import Select from 'react-select';

// Initial state for the main form (device/complaint focused now)
const initialFormData = {
  deviceType: '',
  brandModel: '',
  serialNumber: '',
  customerComplaint: '',
  cost: '',
};

// Initial state for the new customer part of the form
const initialNewCustomerData = {
    newCustomerName: '',
    newCustomerContact: '', // Can be phone or email
    // Add optional fields later if needed: email, address
};

function ServiceOrderForm({ onOrderAdded, onClose }) {
  const [formData, setFormData] = useState(initialFormData);
  const [otherDeviceType, setOtherDeviceType] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [newCustomerData, setNewCustomerData] = useState(initialNewCustomerData);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, full_name, phone_number, email')
          .order('full_name', { ascending: true });

        if (error) throw error;
        setCustomers(data || []);
      } catch (err) {
        console.error("Error fetching customers for form:", err);
        setCustomersError("Gagal memuat daftar pelanggan.");
      } finally {
        setCustomersLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const handleSelectCustomer = (selectedOption) => {
    setSelectedCustomerOption(selectedOption);
    const isNew = selectedOption?.value === '__NEW__';
    setIsAddingNewCustomer(isNew);
    if (!isNew) {
        setNewCustomerData(initialNewCustomerData);
    }
     setError(null);
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomerData(prev => ({ ...prev, [name]: value }));
     setError(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cost' && value !== '' && !/^[0-9]*$/.test(value)) {
        return;
    }
    setFormData(prevData => ({ ...prevData, [name]: value }));
    if (name === 'deviceType' && value !== 'Lainnya') {
      setOtherDeviceType('');
    }
     setError(null);
  };

  const handleOtherDeviceChange = (e) => {
    setOtherDeviceType(e.target.value);
    setError(null);
  };

  const resetForm = () => {
     setFormData(initialFormData);
     setOtherDeviceType('');
     setSelectedCustomerOption(null);
     setNewCustomerData(initialNewCustomerData);
     setIsAddingNewCustomer(false);
     setError(null);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    let customerIdToUse = null;

    try {
        if (isAddingNewCustomer) {
            if (!newCustomerData.newCustomerName.trim()) {
                throw new Error("Nama pelanggan baru tidak boleh kosong.");
            }
            const contact = newCustomerData.newCustomerContact.trim();
            if (!contact) {
                 throw new Error("Kontak pelanggan baru tidak boleh kosong.");
            }

            const isEmail = contact.includes('@');
            let existingCustomerQuery = supabase.from('customers');
            if (isEmail) {
                 existingCustomerQuery = existingCustomerQuery.select('id, full_name').eq('email', contact);
            } else {
                 existingCustomerQuery = existingCustomerQuery.select('id, full_name').eq('phone_number', contact);
            }
             const { data: existingCustomers, error: queryError } = await existingCustomerQuery.maybeSingle();

            if (queryError) {
                 console.error("Error checking existing customer:", queryError);
                 throw new Error("Gagal memeriksa data pelanggan yang sudah ada.");
            }

            if (existingCustomers) {
                 throw new Error(`Pelanggan dengan kontak ini sudah ada: ${existingCustomers.full_name}. Silakan pilih dari daftar.`);
            }
             console.log("No existing customer found, attempting insert...");

            const { data: newCustomer, error: insertCustomerError } = await supabase
                .from('customers')
                .insert({
                    full_name: newCustomerData.newCustomerName.trim(),
                    phone_number: isEmail ? null : contact,
                    email: isEmail ? contact : null,
                })
                .select('id')
                .single();

            if (insertCustomerError) {
                console.error("Supabase customer insert error:", insertCustomerError);
                throw new Error(`Gagal menambahkan pelanggan baru: ${insertCustomerError.message}`);
            }

            if (!newCustomer || !newCustomer.id) {
                throw new Error("Gagal mendapatkan ID pelanggan baru setelah insert.");
            }
            customerIdToUse = newCustomer.id;
            console.log("New customer created with ID:", customerIdToUse);

        } else {
            if (!selectedCustomerOption || !selectedCustomerOption.value || selectedCustomerOption.value === '__NEW__') {
                 throw new Error("Silakan pilih pelanggan dari daftar.");
            }
            customerIdToUse = selectedCustomerOption.value;
             console.log("Using existing customer ID:", customerIdToUse);
        }

        // --- Step 2: Determine Customer Details for Service Order --- 
        let finalCustomerName = '';
        let finalCustomerContact = '';

        if (isAddingNewCustomer) {
            finalCustomerName = newCustomerData.newCustomerName.trim();
            finalCustomerContact = newCustomerData.newCustomerContact.trim();
        } else {
            const selectedCustomer = customers.find(c => c.id === customerIdToUse);
            if (!selectedCustomer) {
                 // This shouldn't happen if validation passed, but good to check
                throw new Error("Data pelanggan yang dipilih tidak ditemukan."); 
            }
            finalCustomerName = selectedCustomer.full_name;
            finalCustomerContact = selectedCustomer.phone_number || selectedCustomer.email || ''; // Use phone first, then email
        }

        // --- Step 3: Insert Service Order --- 
        if (!customerIdToUse) {
             throw new Error("Customer ID tidak valid.");
        }

        const finalDeviceType = formData.deviceType === 'Lainnya'
                                ? otherDeviceType
                                : formData.deviceType;

         if (!finalDeviceType || (formData.deviceType === 'Lainnya' && !otherDeviceType.trim())) {
             throw new Error("Jenis perangkat harus dipilih atau diisi.");
         }
         if (!formData.brandModel.trim()) {
             throw new Error("Merk/Model perangkat harus diisi.");
         }
         if (!formData.customerComplaint.trim()) {
             throw new Error("Keluhan pelanggan harus diisi.");
         }

        const serviceOrderData = {
            customer_id: customerIdToUse,
            customer_name: finalCustomerName,
            customer_contact: finalCustomerContact,
            device_type: finalDeviceType,
            brand_model: formData.brandModel,
            serial_number: formData.serialNumber || null,
            customer_complaint: formData.customerComplaint,
            cost: formData.cost === '' ? null : Number(formData.cost),
        };

         console.log("Attempting to insert service order:", serviceOrderData);
        const { error: insertServiceError } = await supabase
            .from('service_orders')
            .insert([serviceOrderData]);

        if (insertServiceError) {
            console.error("Supabase service order insert error:", insertServiceError);
            throw new Error(`Gagal menyimpan order servis: ${insertServiceError.message}`);
        }

        console.log('Service order berhasil disimpan.');
        resetForm();

        if (onOrderAdded) {
            onOrderAdded();
        }

    } catch (err) {
        console.error('Error during form submission:', err);
        setError(err.message || 'Terjadi kesalahan tidak diketahui.');
    } finally {
        setIsLoading(false);
    }
  };

  const customerSelectOptions = useMemo(() => {
      const options = customers.map(c => ({
          value: c.id,
          label: `${c.full_name} (${c.phone_number || c.email || 'Kontak Kosong'})`
      }));
      options.push({ value: '__NEW__', label: '-- Tambah Pelanggan Baru --' });
      return options;
  }, [customers]);

  const customSelectStyles = {
      control: (base, state) => ({
        ...base,
        minHeight: '38px',
        height: '38px',
        borderColor: state.isFocused ? '#0ea5e9' : '#d1d5db',
        boxShadow: state.isFocused ? '0 0 0 1px #0ea5e9' : 'none',
        '&:hover': {
            borderColor: state.isFocused ? '#0ea5e9' : '#9ca3af',
        }
      }),
      valueContainer: (base) => ({
          ...base,
          height: '38px',
          padding: '0 6px'
      }),
      input: (base) => ({
          ...base,
          margin: '0px',
      }),
      indicatorSeparator: () => ({
        display: 'none',
      }),
      indicatorsContainer: (base) => ({
          ...base,
          height: '38px',
      }),
       menu: base => ({
           ...base,
           zIndex: 20
       })
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col bg-white rounded-lg shadow-xl overflow-hidden h-full">
        {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <FiLoader className="animate-spin h-8 w-8 text-[#0ea5e9]" />
            </div>
        )}

        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
            <h2 id="add-modal-title" className="text-xl font-semibold text-gray-800">Catat Order Servis Baru</h2>
            {onClose && (
                <button type="button" onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#0ea5e9]" aria-label="Tutup">
                    <FiX className="h-5 w-5" />
                </button>
            )}
        </div>

        <div className="p-4 md:p-5 flex-1 overflow-y-auto">
            {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md flex items-start" role="alert">
                    <FiAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {customersError && !customersLoading && (
                <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                    <FiAlertTriangle className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0"/>
                    <p className="text-yellow-700 text-sm">{customersError}</p>
                </div>
            )}

            <fieldset className="mb-4 border border-gray-200 rounded-md p-4 pt-2">
                <legend className="text-sm font-medium text-gray-600 px-1">Pelanggan</legend>
                <div className="mt-2 space-y-3">
                    {customersLoading ? (
                        <div className="flex items-center text-sm text-gray-500">
                            <FiLoader className="animate-spin h-4 w-4 mr-2" /> Memuat pelanggan...
                        </div>
                    ) : (
                    <div>
                      <label htmlFor="customer-select-add" className="block text-sm font-medium text-gray-700 mb-1">Pelanggan</label>
                      <Select
                        instanceId="customer-select-add"
                        options={customerSelectOptions}
                        value={selectedCustomerOption}
                        onChange={handleSelectCustomer}
                        isLoading={customersLoading}
                        isDisabled={isLoading}
                        placeholder="Pilih Pelanggan..."
                        noOptionsMessage={() => customersError ? customersError : (customersLoading ? 'Memuat...' : 'Tidak ada pelanggan, tambahkan baru.')}
                        styles={customSelectStyles}
                        className="react-select-container z-20"
                        classNamePrefix="react-select"
                      />
                       {customersError && !customersLoading && (
                           <p className="mt-1 text-xs text-red-600">{customersError}</p>
                       )}
                    </div>
                    )}

                    {isAddingNewCustomer && (
                        <div className="pt-3 mt-3 border-t border-gray-200 space-y-3">
                             <h4 className="text-sm font-medium text-gray-700">Detail Pelanggan Baru</h4>
                             <div>
                                <label htmlFor="newCustomerName" className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiUser className="h-4 w-4 text-gray-400" /></div>
                                    <input type="text" id="newCustomerName" name="newCustomerName" value={newCustomerData.newCustomerName} onChange={handleNewCustomerChange} required={isAddingNewCustomer} disabled={isLoading} className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" placeholder="Nama Pelanggan Baru"/>
                                </div>
                             </div>
                             <div>
                                 <label htmlFor="newCustomerContact" className="block text-xs font-medium text-gray-600 mb-1">Kontak (Telepon / Email)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPhone className="h-4 w-4 text-gray-400" /></div>
                                    <input type="text" id="newCustomerContact" name="newCustomerContact" value={newCustomerData.newCustomerContact} onChange={handleNewCustomerChange} required={isAddingNewCustomer} disabled={isLoading} className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9]" placeholder="Nomor Telepon atau Email"/>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </fieldset>

            <fieldset className="mb-4 border border-gray-200 rounded-md p-4 pt-2">
                <legend className="text-sm font-medium text-gray-600 px-1">Informasi Perangkat & Keluhan</legend>
                <div className="space-y-3 mt-2">
                    <div>
                      <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">Jenis Perangkat</label>
                       <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiPackage className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          id="deviceType" name="deviceType" value={formData.deviceType}
                          onChange={handleChange} required disabled={isLoading}
                          className="block w-full pl-10 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm appearance-none"
                        >
                          <option value="">Pilih Jenis Perangkat</option>
                          <option value="Laptop">Laptop</option>
                          <option value="PC">PC (Desktop)</option>
                          <option value="Printer">Printer</option>
                          <option value="Monitor">Monitor</option>
                          <option value="Lainnya">Lainnya...</option>
                        </select>
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 3a.75.75 0 01.53.22l3.5 3.5a.75.75 0 01-1.06 1.06L10 4.81 6.53 8.28a.75.75 0 01-1.06-1.06l3.5-3.5A.75.75 0 0110 3zm-3.72 9.28a.75.75 0 011.06 0L10 15.19l2.47-2.47a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 010-1.06z" clipRule="evenodd" />
                            </svg>
                         </div>
                      </div>
                    </div>

                    {formData.deviceType === 'Lainnya' && (
                        <div className="pl-10">
                            <label htmlFor="otherDeviceType" className="sr-only">Jenis Perangkat Lainnya</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FiPackage className="h-4 w-4 text-gray-400" /></div>
                                <input
                                  type="text" id="otherDeviceType" name="otherDeviceType"
                                  value={otherDeviceType} onChange={handleOtherDeviceChange}
                                  required={formData.deviceType === 'Lainnya'}
                                  disabled={isLoading}
                                  className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9]"
                                  placeholder="Masukkan jenis perangkat"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                      <label htmlFor="brandModel" className="block text-sm font-medium text-gray-700 mb-1">Merk / Model</label>
                      <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiTag className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text" id="brandModel" name="brandModel" value={formData.brandModel}
                          onChange={handleChange} required disabled={isLoading}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">Nomor Seri <span className="text-xs text-gray-500">(Opsional)</span></label>
                       <div className="relative rounded-md shadow-sm">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiTag className="h-5 w-5 text-gray-400" /> 
                        </div>
                        <input
                          type="text" id="serialNumber" name="serialNumber" value={formData.serialNumber}
                          onChange={handleChange} disabled={isLoading}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"
                        />
                       </div>
                    </div>

                    <div>
                      <label htmlFor="customerComplaint" className="block text-sm font-medium text-gray-700 mb-1">Keluhan Pelanggan</label>
                       <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 top-0 pt-2 pl-3 flex items-start pointer-events-none">
                            <FiAlignLeft className="h-5 w-5 text-gray-400" />
                        </div>
                        <textarea
                          id="customerComplaint" name="customerComplaint" rows="3"
                          value={formData.customerComplaint} onChange={handleChange} required disabled={isLoading}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm"
                        ></textarea>
                      </div>
                    </div>

                    <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">Biaya Servis (Opsional)</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Rp</span>
                            </div>
                            <input
                                type="number"
                                id="cost"
                                name="cost"
                                value={formData.cost}
                                onChange={handleChange}
                                min="0"
                                step="1000"
                                disabled={isLoading}
                                className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#0ea5e9] focus:border-[#0ea5e9] sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                            />
                             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                 <FiDollarSign className="h-5 w-5 text-gray-400" /> 
                            </div>
                        </div>
                    </div>
                </div>
            </fieldset>
        </div>

        <div className="flex justify-end space-x-3 p-4 bg-gray-50 border-t rounded-b-lg flex-shrink-0">
            {onClose && (
                <button
                    type="button" onClick={onClose} disabled={isLoading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ea5e9] disabled:opacity-50 cursor-pointer"
                > Batal </button>
            )}
            <button
                type="submit" disabled={isLoading}
                className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0ea5e9] hover:bg-[#0c8acb] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#93c5fd] disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-100 ease-in-out active:scale-95 cursor-pointer"
            >
                {isLoading && <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />}
                {isLoading ? 'Menyimpan...' : 'Simpan Order'}
            </button>
        </div>
    </form>
  );
}

export default ServiceOrderForm; 