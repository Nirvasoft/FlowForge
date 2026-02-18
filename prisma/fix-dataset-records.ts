/**
 * Fix script: Insert missing dataset records for stationery/sundry and training datasets
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixDatasetRecords() {
    console.log('🔧 Fixing dataset records...\n');

    const account = await prisma.account.findUnique({ where: { slug: 'demo' } });
    if (!account) throw new Error('Demo account not found.');
    const adminUser = await prisma.user.findUnique({ where: { accountId_email: { accountId: account.id, email: 'admin@demo.com' } } });
    if (!adminUser) throw new Error('Demo admin user not found.');

    const fixDs = async (name: string, records: any[]) => {
        const ds = await prisma.dataset.findFirst({ where: { accountId: account.id, name } });
        if (!ds) { console.log(`  ⚠️ Dataset ${name} not found, skipping`); return; }
        const existing = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        if (existing > 0) {
            console.log(`  ✅ ${name}: already has ${existing} records`);
            return;
        }
        for (const r of records) {
            await prisma.datasetRecord.create({ data: { datasetId: ds.id, data: r, createdBy: adminUser.id } });
        }
        await prisma.dataset.update({ where: { id: ds.id }, data: { rowCount: records.length } });
        console.log(`  ✅ ${name}: inserted ${records.length} records`);
    };

    // Also fix MPT datasets rowCount mismatches
    const fixRowCount = async (name: string) => {
        const ds = await prisma.dataset.findFirst({ where: { accountId: account.id, name } });
        if (!ds) return;
        const actual = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        if (Number(ds.rowCount) !== actual) {
            await prisma.dataset.update({ where: { id: ds.id }, data: { rowCount: actual } });
            console.log(`  🔄 ${name}: rowCount ${ds.rowCount} → ${actual}`);
        }
    };

    console.log('--- Stationery / Sundry datasets ---');
    await fixDs('SorS', [
        { category: 'Stationery' }, { category: 'Sundry' }, { category: 'Tissue' }, { category: 'Toner & Drum' },
    ]);
    await fixDs('TonerDrumPrice', [
        { item_name: 'HP 05A Black Toner', unit_price: 85000, compatible_model: 'HP LaserJet P2035/P2055' },
        { item_name: 'HP 83A Black Toner', unit_price: 75000, compatible_model: 'HP LaserJet Pro M125/M127' },
        { item_name: 'Canon 328 Toner', unit_price: 65000, compatible_model: 'Canon MF4450/MF4550' },
        { item_name: 'HP CF226A Toner', unit_price: 120000, compatible_model: 'HP LaserJet Pro M402/M426' },
        { item_name: 'HP CE505A Drum Unit', unit_price: 180000, compatible_model: 'HP LaserJet P2035/P2055' },
        { item_name: 'Brother TN-2380 Toner', unit_price: 55000, compatible_model: 'Brother HL-L2360/DCP-L2540' },
        { item_name: 'HP CF219A Drum', unit_price: 195000, compatible_model: 'HP LaserJet Pro M102/M130' },
    ]);
    await fixDs('SundryGood', [
        { item_name: 'Trash Bag (Large)', unit_price: 3500, item_type: 'Cleaning' },
        { item_name: 'Hand Soap Refill (500ml)', unit_price: 2800, item_type: 'Hygiene' },
        { item_name: 'Air Freshener Spray', unit_price: 4500, item_type: 'Cleaning' },
        { item_name: 'Floor Cleaner (1L)', unit_price: 5200, item_type: 'Cleaning' },
        { item_name: 'Paper Towel Roll', unit_price: 1500, item_type: 'Hygiene' },
        { item_name: 'Dishwashing Liquid (500ml)', unit_price: 2200, item_type: 'Kitchen' },
    ]);
    await fixDs('TissueMaster', [
        { item_name: 'Facial Tissue Box (200 sheets)', unit_price: 1800 },
        { item_name: 'Toilet Roll (10-pack)', unit_price: 5500 },
        { item_name: 'Wet Wipes (80 sheets)', unit_price: 2500 },
        { item_name: 'Kitchen Towel Roll (2-pack)', unit_price: 3200 },
        { item_name: 'Pocket Tissue (10-pack)', unit_price: 1200 },
    ]);
    await fixDs('StationeryMaster', [
        { item_name: 'A4 Paper', item_type: 'Paper' }, { item_name: 'A3 Paper', item_type: 'Paper' },
        { item_name: 'Ballpoint Pen', item_type: 'Writing' }, { item_name: 'Marker Pen', item_type: 'Writing' },
        { item_name: 'Stapler', item_type: 'Office Supply' }, { item_name: 'Sticky Notes', item_type: 'Office Supply' },
        { item_name: 'File Folder', item_type: 'Filing' }, { item_name: 'Envelope (A4)', item_type: 'Mailing' },
    ]);
    await fixDs('StationeryPriceMaster', [
        { order_item: 'A4 Paper (Double A 80gsm, Ream)', unit_price: 5500, item_type: 'Paper' },
        { order_item: 'A4 Paper (IK Plus 70gsm, Ream)', unit_price: 4800, item_type: 'Paper' },
        { order_item: 'A3 Paper (Double A 80gsm, Ream)', unit_price: 9500, item_type: 'Paper' },
        { order_item: 'Ballpoint Pen (Blue, Box of 12)', unit_price: 3600, item_type: 'Writing' },
        { order_item: 'Ballpoint Pen (Black, Box of 12)', unit_price: 3600, item_type: 'Writing' },
        { order_item: 'Marker Pen (Set of 4)', unit_price: 4200, item_type: 'Writing' },
        { order_item: 'Heavy Duty Stapler', unit_price: 8500, item_type: 'Office Supply' },
        { order_item: 'Sticky Notes (3x3, 5-pack)', unit_price: 2800, item_type: 'Office Supply' },
        { order_item: 'File Folder (Pack of 10)', unit_price: 6500, item_type: 'Filing' },
        { order_item: 'A4 Envelope (Pack of 50)', unit_price: 3500, item_type: 'Mailing' },
    ]);

    console.log('\n--- Training LMS datasets ---');
    await fixDs('JOITTrainingDatabase', [
        { training_code: 'TRN-001', training_name: 'Advanced Python Programming', training_path: 'Technical Skill Training', training_schedule: 'Mon-Fri, 9AM-12PM', class_size: 25, training_location: 'Yangon HQ Training Room A', trainer: 'Dr. Kyaw Zin', training_course: 'Python Advanced', training_month: 'March 2026', learning_type: 'Classroom', training_time: '3 hours' },
        { training_code: 'TRN-002', training_name: 'Business English Communication', training_path: 'English Training', training_schedule: 'Tue & Thu, 2PM-4PM', class_size: 20, training_location: 'Online (Zoom)', trainer: 'Ms. Sarah Johnson', training_course: 'Business English', training_month: 'March 2026', learning_type: 'Online', training_time: '2 hours' },
        { training_code: 'TRN-003', training_name: 'Leadership & Management Skills', training_path: 'Non-Technical Training', training_schedule: 'Wed, 10AM-3PM', class_size: 15, training_location: 'Mandalay Office', trainer: 'U Aung Thu', training_course: 'Leadership Fundamentals', training_month: 'April 2026', learning_type: 'Workshop', training_time: '5 hours' },
        { training_code: 'TRN-004', training_name: 'Microsoft Excel Advanced', training_path: 'Computer Training', training_schedule: 'Mon & Wed, 1PM-3PM', class_size: 30, training_location: 'Yangon HQ Computer Lab', trainer: 'Daw Hnin Wai', training_course: 'Excel Advanced', training_month: 'March 2026', learning_type: 'Hands-on', training_time: '2 hours' },
        { training_code: 'TRN-005', training_name: 'JOIT System Overview', training_path: 'JO Knowledge and Procedure Training', training_schedule: 'Fri, 9AM-11AM', class_size: 40, training_location: 'Online (Teams)', trainer: 'Ko Min Thant', training_course: 'JOIT Orientation', training_month: 'Feb 2026', learning_type: 'Online', training_time: '2 hours' },
        { training_code: 'TRN-006', training_name: 'Core Values & Competency Workshop', training_path: 'Core Competency Training', training_schedule: 'Thu, 10AM-4PM', class_size: 20, training_location: 'Naypyidaw Office', trainer: 'Daw Thin Thin Aye', training_course: 'Core Values', training_month: 'May 2026', learning_type: 'Workshop', training_time: '6 hours' },
        { training_code: 'TRN-007', training_name: 'SAP ERP Fundamentals', training_path: 'Corporate Application and Procedure', training_schedule: 'Mon-Fri, 9AM-5PM', class_size: 15, training_location: 'Yangon HQ Training Room B', trainer: 'External: SAP Academy', training_course: 'SAP Basics', training_month: 'April 2026', learning_type: 'Classroom', training_time: '8 hours' },
        { training_code: 'TRN-008', training_name: 'Project Management Professional', training_path: 'Non-Technical Training', training_schedule: 'Sat, 9AM-1PM', class_size: 20, training_location: 'Online (Zoom)', trainer: 'Dr. Myo Win', training_course: 'PMP Prep', training_month: 'March 2026', learning_type: 'Online', training_time: '4 hours' },
    ]);
    await fixDs('JOITSectionMaster', [
        { section_code: 'SEC-01', section_name: 'Technology' }, { section_code: 'SEC-02', section_name: 'Business Operations' },
        { section_code: 'SEC-03', section_name: 'Corporate Services' }, { section_code: 'SEC-04', section_name: 'Network & Infrastructure' },
    ]);
    await fixDs('YangonCityList', [
        { city_name: 'Yangon', region: 'Yangon' }, { city_name: 'Mandalay', region: 'Mandalay' },
        { city_name: 'Naypyidaw', region: 'Naypyidaw' }, { city_name: 'Sagaing', region: 'Sagaing' },
        { city_name: 'Bago', region: 'Bago' }, { city_name: 'Mawlamyine', region: 'Mon' },
        { city_name: 'Pathein', region: 'Ayeyarwady' }, { city_name: 'Taunggyi', region: 'Shan' },
    ]);
    await fixDs('JOITDomesticBusinessTrip', [
        { from_city: 'Yangon', to_city: 'Mandalay', transport_cost: 45000, taxi_cost: 15000 },
        { from_city: 'Yangon', to_city: 'Naypyidaw', transport_cost: 35000, taxi_cost: 12000 },
        { from_city: 'Mandalay', to_city: 'Yangon', transport_cost: 45000, taxi_cost: 15000 },
        { from_city: 'Mandalay', to_city: 'Naypyidaw', transport_cost: 25000, taxi_cost: 10000 },
        { from_city: 'Naypyidaw', to_city: 'Yangon', transport_cost: 35000, taxi_cost: 12000 },
        { from_city: 'Sagaing', to_city: 'Mandalay', transport_cost: 8000, taxi_cost: 5000 },
    ]);
    await fixDs('GenderList', [{ gender: 'Male' }, { gender: 'Female' }, { gender: 'Other' }]);
    await fixDs('StayHostelOptions', [
        { option: 'Yes - Company Hostel' }, { option: 'Yes - External Hotel' }, { option: 'No' },
    ]);

    console.log('\n--- Fixing MPT dataset rowCounts ---');
    await fixRowCount('MPTOfficeMaster');
    await fixRowCount('MPTDivisionMaster');
    await fixRowCount('MPTDepartmentMaster');
    await fixRowCount('MPTEmployeeMaster');
    await fixRowCount('MPTTeamMaster');

    // Final verification
    console.log('\n--- Final verification ---');
    const allDs = await prisma.dataset.findMany({ where: { accountId: account.id }, orderBy: { name: 'asc' } });
    for (const ds of allDs) {
        const actual = await prisma.datasetRecord.count({ where: { datasetId: ds.id } });
        const status = Number(ds.rowCount) === actual && actual > 0 ? '✅' : actual === 0 ? '❌ EMPTY' : '⚠️ MISMATCH';
        console.log(`  ${status} ${ds.name}: rowCount=${ds.rowCount}, actual=${actual}`);
    }

    console.log('\n🔧 Fix complete');
}

fixDatasetRecords()
    .catch((e) => { console.error('❌ Fix failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
