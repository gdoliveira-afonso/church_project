const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Populando o banco de dados com registros iniciais...');

    // Limpar o banco primeiro (exceto admin)
    await prisma.attendanceRecord.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.cellCancellation?.deleteMany().catch(() => null);
    await prisma.cellCancellations?.deleteMany().catch(() => null);
    await prisma.cellJustification?.deleteMany().catch(() => null);
    await prisma.pastoralNote.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.personTrack.deleteMany();
    await prisma.consolidation.deleteMany();
    await prisma.person.deleteMany();
    await prisma.cell.deleteMany();
    await prisma.track.deleteMany();
    await prisma.eventException.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany({ where: { username: { not: 'admin' } } });

    // 1. Tracks (Trilhas)
    const tBatismoAgua = await prisma.track.create({ data: { name: 'Batismo nas Águas', category: 'espiritual', icon: 'water_drop', color: 'blue' } });
    const tBatismoEs = await prisma.track.create({ data: { name: 'Batismo com o Espírito Santo', category: 'espiritual', icon: 'local_fire_department', color: 'orange' } });
    const tEscola = await prisma.track.create({ data: { name: 'Escola de Líderes', category: 'espiritual', icon: 'school', color: 'purple' } });
    const tEncontro = await prisma.track.create({ data: { name: 'Encontro com Deus', category: 'retiros', icon: 'volunteer_activism', color: 'emerald' } });

    // 2. Users (Líderes)
    const pw = await bcrypt.hash('123456', 10);
    const l1 = await prisma.user.create({ data: { name: 'João Silva', username: 'joao.lider', password: pw, role: 'LEADER' } });
    const l2 = await prisma.user.create({ data: { name: 'Maria Souza', username: 'maria.lider', password: pw, role: 'LEADER' } });

    // 3. Cells (Células)
    const c1 = await prisma.cell.create({ data: { name: 'Célula Betel', leaderId: l1.id, meetingDay: 'Sexta-feira', meetingTime: '20:00', address: 'Rua das Flores, 123' } });
    const c2 = await prisma.cell.create({ data: { name: 'Célula Ebenezer', leaderId: l2.id, meetingDay: 'Sábado', meetingTime: '19:30', address: 'Av Principal, 404' } });

    // 4. People (Pessoas)
    const pts = [
        { name: 'Ana Oliveira', phone: '11999999999', status: 'Membro', cellId: c1.id, tracks: [tBatismoAgua.id, tEncontro.id] },
        { name: 'Carlos Santos', phone: '11988888888', status: 'Novo Convertido', cellId: c1.id, tracks: [] },
        { name: 'Fernanda Lima', phone: '11977777777', status: 'Visitante', cellId: c1.id, tracks: [] },
        { name: 'Pedro Alves', phone: '11966666666', status: 'Membro', cellId: c2.id, tracks: [tBatismoAgua.id, tBatismoEs.id, tEscola.id, tEncontro.id] },
        { name: 'Mariana Costa', phone: '11955555555', status: 'Reconciliação', cellId: c2.id, tracks: [tBatismoAgua.id] }
    ];

    for (const data of pts) {
        const p = await prisma.person.create({
            data: {
                name: data.name, phone: data.phone, status: data.status, cellId: data.cellId
            }
        });

        // Add tracks
        for (const trackId of data.tracks) {
            await prisma.personTrack.create({ data: { personId: p.id, trackId } });
        }

        // Add some visits based on status
        if (data.status === 'Novo Convertido') {
            await prisma.visit.create({
                data: { personId: p.id, date: new Date().toISOString().split('T')[0], type: 'Visita de Consolidação', authorId: l1.id, notes: 'Primeira visita de contato.' }
            });
            await prisma.consolidation.create({
                data: { personId: p.id, status: 'IN_PROGRESS' }
            });
        }
    }

    // Pessoas extras sem visita recente para testar o alerta de "Sem Visita > 60d"
    const aband = await prisma.person.create({ data: { name: 'Gustavo Perfil', status: 'Membro', cellId: c1.id } });
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 70); // 70 dias atrás
    await prisma.visit.create({
        data: { personId: aband.id, date: pastDate.toISOString().split('T')[0], type: 'Visita de Acompanhamento', authorId: l1.id, notes: 'Estava tudo bem na última visita.' }
    });

    // 5. Events (Eventos)
    await prisma.event.create({
        data: { title: 'Culto de Celebração', date: new Date().toISOString().split('T')[0], recurrence: 'weekly', startTime: '19:00', endTime: '21:00', color: 'blue' }
    });

    console.log('Seed do banco de dados completo com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
