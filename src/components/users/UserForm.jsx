import React, { useState, useEffect } from 'react';
    import { useData } from '@/contexts/SupabaseDataContext';
    import { Button } from '@/components/ui/button';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import InputWithMask from '@/components/ui/masked-input';
    import { MASKS } from '@/lib/masks';
    
    const initialFormData = {
      name: '',
      email: '',
      telefone: '',
      password: '',
      role: 'user',
      sellerId: '',
    };
    
    export default function UserForm({ user, onSave, onCancel }) {
      const [formData, setFormData] = useState(initialFormData);
      const { sellers } = useData();
    
      useEffect(() => {
        if (user) {
          setFormData({
            id: user.id,
            name: user.name || '',
            email: user.email || '',
            telefone: user.telefone || '',
            password: '', 
            role: user.role || 'user',
            sellerId: user.seller_id || null,
          });
        } else {
          setFormData(initialFormData);
        }
      }, [user]);
    
      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
      };
    
      const handleSelectChange = (name, value) => {
        const newFormData = { ...formData, [name]: value };
        if (name === 'sellerId') {
          const selectedSeller = sellers.find(s => s.id === value);
          if (selectedSeller) {
            newFormData.name = selectedSeller.nome;
            newFormData.email = selectedSeller.email;
          } else if (value === null) {
            newFormData.name = '';
            newFormData.email = '';
          }
        }
        setFormData(newFormData);
      };
      
      const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
          ...formData,
          seller_id: formData.sellerId
        }
        delete payload.sellerId;
        onSave(payload);
      };
    
      return (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="sellerId">Vendedor Vinculado</Label>
              <Select onValueChange={(v) => handleSelectChange('sellerId', v)} value={formData.sellerId || null}>
                <SelectTrigger className="input-field"><SelectValue placeholder="Selecione um vendedor..."/></SelectTrigger>
                <SelectContent className="glass-effect">
                  <SelectItem value={null}>Nenhum</SelectItem>
                  {sellers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome} ({s.cpf})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nome de Usuário</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="input-field" placeholder="Preenchido pelo vendedor" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} className="input-field" required disabled />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} className="input-field" placeholder={user ? 'Deixe em branco para não alterar' : ''} />
            </div>
            <div>
              <Label htmlFor="role">Perfil</Label>
              <Select onValueChange={(v) => handleSelectChange('role', v)} value={formData.role}>
                <SelectTrigger className="input-field"><SelectValue placeholder="Selecione um perfil"/></SelectTrigger>
                <SelectContent className="glass-effect">
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="btn-primary">Salvar</Button>
          </div>
        </form>
      );
    }