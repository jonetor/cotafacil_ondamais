import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, User, Link, Mail, Phone } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PeopleForm from './PeopleForm';

function PeoplePage() {
  const { people, users, addPerson, updatePerson, deletePerson } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const { toast } = useToast();

  const handleSavePerson = (personData) => {
    if (editingPerson) {
      updatePerson(editingPerson.id, personData);
      toast({ title: "Pessoa atualizada!", description: "Os dados foram atualizados com sucesso." });
    } else {
      addPerson(personData);
      toast({ title: "Pessoa adicionada!", description: "A nova pessoa foi adicionada com sucesso." });
    }
    setIsModalOpen(false);
    setEditingPerson(null);
  };

  const handleEdit = (person) => {
    setEditingPerson(person);
    setIsModalOpen(true);
  };
  
  const getUserLink = (personId) => {
    return users.find(u => u.personId === personId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Pessoas</h1><p className="text-white/60">Gerencie as pessoas físicas do sistema.</p></div>
        <Button onClick={() => { setEditingPerson(null); setIsModalOpen(true); }} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nova Pessoa</Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass-effect border-white/20 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingPerson ? 'Editar Pessoa' : 'Nova Pessoa'}</DialogTitle>
            <DialogDescription>Preencha os dados cadastrais.</DialogDescription>
          </DialogHeader>
           <div className="max-h-[70vh] overflow-y-auto">
            <PeopleForm person={editingPerson} onSave={handleSavePerson} onCancel={() => setIsModalOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {people.map((person, index) => {
           const linkedUser = getUserLink(person.id);
           return (
            <motion.div key={person.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="floating-card card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-sky-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{person.nome_razao}</h3>
                    <p className="text-sm text-white/80">CPF: {person.cpf_cnpj}</p>
                  </div>
                </div>
                 <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(person)} className="text-white/60 hover:text-white"><Edit className="w-4 h-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300" disabled={!!linkedUser}><Trash2 className="w-4 h-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="glass-effect border-white/20 text-white">
                      <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir {person.nome_razao}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild><Button variant="ghost">Cancelar</Button></AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePerson(person.id)} asChild><Button variant="destructive">Excluir</Button></AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/80">
                {person.email && <div className="flex items-center space-x-2"><Mail className="w-4 h-4" /><span>{person.email}</span></div>}
                {person.telefone && <div className="flex items-center space-x-2"><Phone className="w-4 h-4" /><span>{person.telefone}</span></div>}
                {linkedUser && (
                   <div className="flex items-center space-x-2 pt-2 text-cyan-400">
                    <Link className="w-4 h-4" />
                    <span>Vinculado ao usuário: {linkedUser.name}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        )}
      </div>
    </div>
  );
}

export default PeoplePage;