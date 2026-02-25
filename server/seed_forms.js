const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    const formsCount = await prisma.form.count();
    if (formsCount === 0) {
        const defaultForms = [
            { name: 'Novo Convertido', status: 'ativo', showOnLogin: true, icon: 'favorite', color: 'emerald', subtitle: 'Aceitou Jesus? Cadastre-se aqui', personStatus: 'Novo Convertido', fields: JSON.stringify([{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Data de Nascimento', type: 'date' }, { name: 'Endereço', type: 'text' }, { name: "Como conheceu a igreja?", type: 'select', options: ['Indicação', 'Internet', 'Campanha', 'Evento', 'Outro'] }]) },
            { name: 'Reconciliação', status: 'ativo', showOnLogin: true, icon: 'handshake', color: 'purple', subtitle: 'Retornando à igreja? Bem-vindo de volta', personStatus: 'Reconciliação', fields: JSON.stringify([{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: 'Célula anterior', type: 'text' }, { name: 'Motivo do retorno', type: 'textarea' }]) },
            { name: 'Visitante', status: 'ativo', showOnLogin: true, icon: 'waving_hand', color: 'blue', subtitle: 'Primeira vez na igreja? Registre-se', personStatus: 'Visitante', fields: JSON.stringify([{ name: 'Nome Completo', type: 'text', required: true }, { name: 'Telefone / WhatsApp', type: 'phone', required: true }, { name: 'Email', type: 'email' }, { name: "Como conheceu a igreja?", type: 'select', options: ['Indicação de amigo', 'Internet/Redes Sociais', 'Passou na frente', 'Evento', 'Outro'] }]) },
            { name: 'Pedido de Oração', status: 'ativo', showOnLogin: false, icon: 'volunteer_activism', color: 'orange', subtitle: 'Envie seu pedido de oração', fields: JSON.stringify([{ name: 'Nome', type: 'text', required: true }, { name: 'Pedido', type: 'textarea', required: true }]) }
        ];

        for (const f of defaultForms) {
            await prisma.form.create({ data: f });
        }
        console.log('Seed de forms concluido');
    } else {
        console.log('Forms ja existem, skip seed');
    }
}
seed().catch(console.error).finally(() => prisma.$disconnect());
