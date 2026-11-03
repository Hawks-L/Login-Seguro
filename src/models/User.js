import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Hash previo al guardado
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Hash de una contraseña que nadie tiene. Se compara cuando el usuario no existe para que
// el login tarde lo mismo en ambos casos y no se pueda averiguar qué correos están registrados.
const DUMMY_HASH = bcrypt.hashSync('contraseña-que-no-existe', BCRYPT_ROUNDS);
export const compareWithDummy = (plain) => bcrypt.compare(plain, DUMMY_HASH);

const User = mongoose.model('User', userSchema);
export default User;
