const specificationSchema = new mongoose.Schema(
  {
    name: { type: localizedStringSchema, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    unit: {
      en: { type: String, trim: true, default: "", required: false },
      ar: { type: String, trim: true, default: "", required: false },
    },
    isFilterable: { type: Boolean, default: false },
  },
  { _id: false }
);
