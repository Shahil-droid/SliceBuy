import { MapPin, User, Phone, Home, Building2, Map } from 'lucide-react';

/* ── Indian States ───────────────────────────────────────── */
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ── Top Indian Cities ───────────────────────────────────── */
const INDIAN_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai',
    'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
    'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
    'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
    'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivli', 'Vasai-Virar',
    'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
    'Allahabad (Prayagraj)', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
    'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota',
    'Guwahati', 'Chandigarh', 'Solapur', 'Hubballi-Dharwad', 'Tiruchirappalli',
    'Bareilly', 'Aligarh', 'Moradabad', 'Mysore', 'Gurugram', 'Noida',
    'Thiruvananthapuram', 'Kochi', 'Bhubaneswar', 'Dehradun', 'Mangalore',
    'Udaipur', 'Jalandhar', 'Bhilai', 'Kolhapur', 'Ajmer', 'Warangal',
    'Nellore', 'Siliguri', 'Saharanpur', 'Guntur', 'Bikaner', 'Amravati',
];

/**
 * AddressForm — reusable delivery address form with suggestions.
 *
 * Props:
 *   address     — { fullName, phone, addressLine1, addressLine2, city, state, pincode }
 *   errors      — validation error strings keyed by field name
 *   onChange    — handler(e) called on every input change
 *   onSubmit    — optional submit handler (wraps the <form>)
 *   idPrefix    — string prefix for all field IDs (default: 'addr')
 */
const AddressForm = ({ address, errors, onChange, onSubmit, idPrefix = 'addr' }) => {
    return (
        <form
            className="checkout-form"
            onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit(); } : (e) => e.preventDefault()}
            autoComplete="on"
        >
            {/* Hidden datalists */}
            <datalist id={`${idPrefix}-cities-list`}>
                {INDIAN_CITIES.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id={`${idPrefix}-states-list`}>
                {INDIAN_STATES.map(s => <option key={s} value={s} />)}
            </datalist>

            {/* Full Name */}
            <div className="checkout-form__group">
                <label htmlFor={`${idPrefix}-fullName`}>Full Name *</label>
                <div className="checkout-form__input-wrap">
                    <User size={18} className="checkout-form__icon" />
                    <input
                        type="text"
                        id={`${idPrefix}-fullName`}
                        name="fullName"
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={address.fullName}
                        onChange={onChange}
                        className={errors.fullName ? 'checkout-form__input--error' : ''}
                    />
                </div>
                {errors.fullName && <span className="checkout-form__error">{errors.fullName}</span>}
            </div>

            {/* Phone */}
            <div className="checkout-form__group">
                <label htmlFor={`${idPrefix}-phone`}>Phone Number *</label>
                <div className="checkout-form__input-wrap">
                    <Phone size={18} className="checkout-form__icon" />
                    <input
                        type="tel"
                        id={`${idPrefix}-phone`}
                        name="phone"
                        autoComplete="tel-national"
                        placeholder="10-digit mobile number"
                        value={address.phone}
                        onChange={onChange}
                        className={errors.phone ? 'checkout-form__input--error' : ''}
                    />
                </div>
                {errors.phone && <span className="checkout-form__error">{errors.phone}</span>}
            </div>

            {/* Address Line 1 */}
            <div className="checkout-form__group">
                <label htmlFor={`${idPrefix}-addressLine1`}>Address Line 1 *</label>
                <div className="checkout-form__input-wrap">
                    <Home size={18} className="checkout-form__icon" />
                    <input
                        type="text"
                        id={`${idPrefix}-addressLine1`}
                        name="addressLine1"
                        autoComplete="address-line1"
                        placeholder="House/Flat No., Building, Street"
                        value={address.addressLine1}
                        onChange={onChange}
                        className={errors.addressLine1 ? 'checkout-form__input--error' : ''}
                    />
                </div>
                {errors.addressLine1 && <span className="checkout-form__error">{errors.addressLine1}</span>}
            </div>

            {/* Address Line 2 */}
            <div className="checkout-form__group">
                <label htmlFor={`${idPrefix}-addressLine2`}>Address Line 2</label>
                <div className="checkout-form__input-wrap">
                    <Building2 size={18} className="checkout-form__icon" />
                    <input
                        type="text"
                        id={`${idPrefix}-addressLine2`}
                        name="addressLine2"
                        autoComplete="address-line2"
                        placeholder="Landmark, Area (optional)"
                        value={address.addressLine2}
                        onChange={onChange}
                    />
                </div>
            </div>

            {/* City / State / Pincode row */}
            <div className="checkout-form__row">
                <div className="checkout-form__group">
                    <label htmlFor={`${idPrefix}-city`}>City *</label>
                    <div className="checkout-form__input-wrap">
                        <Building2 size={18} className="checkout-form__icon" />
                        <input
                            type="text"
                            id={`${idPrefix}-city`}
                            name="city"
                            autoComplete="address-level2"
                            placeholder="City"
                            list={`${idPrefix}-cities-list`}
                            value={address.city}
                            onChange={onChange}
                            className={errors.city ? 'checkout-form__input--error' : ''}
                        />
                    </div>
                    {errors.city && <span className="checkout-form__error">{errors.city}</span>}
                </div>

                <div className="checkout-form__group">
                    <label htmlFor={`${idPrefix}-state`}>State *</label>
                    <div className="checkout-form__input-wrap">
                        <Map size={18} className="checkout-form__icon" />
                        <input
                            type="text"
                            id={`${idPrefix}-state`}
                            name="state"
                            autoComplete="address-level1"
                            placeholder="State"
                            list={`${idPrefix}-states-list`}
                            value={address.state}
                            onChange={onChange}
                            className={errors.state ? 'checkout-form__input--error' : ''}
                        />
                    </div>
                    {errors.state && <span className="checkout-form__error">{errors.state}</span>}
                </div>

                <div className="checkout-form__group">
                    <label htmlFor={`${idPrefix}-pincode`}>Pincode *</label>
                    <div className="checkout-form__input-wrap">
                        <MapPin size={18} className="checkout-form__icon" />
                        <input
                            type="text"
                            id={`${idPrefix}-pincode`}
                            name="pincode"
                            autoComplete="postal-code"
                            placeholder="6-digit pincode"
                            value={address.pincode}
                            onChange={onChange}
                            className={errors.pincode ? 'checkout-form__input--error' : ''}
                        />
                    </div>
                    {errors.pincode && <span className="checkout-form__error">{errors.pincode}</span>}
                </div>
            </div>
        </form>
    );
};

export default AddressForm;
