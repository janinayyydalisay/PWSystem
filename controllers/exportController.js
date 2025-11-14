import { db } from '../models/db.js';


const EXCEL_COLUMN_WIDTHS = {
    plantId: { wch: 15 },
    plantName: { wch: 25 },
    description: { wch: 30 },
    date: { wch: 12 },
    time: { wch: 12 },
    duration: { wch: 10 },
    status: { wch: 12 },
    moistureLevel: { wch: 15 },
    triggerThreshold: { wch: 15 },
    sensor: { wch: 15 },
    scheduleTime: { wch: 15 },
    frequency: { wch: 10 },
    nextSchedule: { wch: 20 },
    triggeredBy: { wch: 20 },
    userNote: { wch: 30 }
};

const PDF_STYLES = {
    header: {
        fontSize: 12,
        bold: true,
        fillColor: [41, 128, 185],
        textColor: 255,
        valign: 'middle',
        halign: 'center'
    },
    cell: {
        fontSize: 10,
        valign: 'middle'
    },
    alternateRow: {
        fillColor: [245, 245, 245]
    }
};


export async function getModeTableData(req, res) {
    try {
        const requestedMode = req.params.mode;
        
        if (requestedMode !== 'all' && !['manual', 'automatic', 'scheduled'].includes(requestedMode)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid mode specified'
            });
        }

        // Reference to plants and pump activities collections
        const plantsRef = db.collection('plants');
        const activitiesRef = db.collection('pumpActivities');

        // Get all plants or filter by mode
        let plantsSnapshot;
        if (requestedMode === 'all') {
            plantsSnapshot = await plantsRef.orderBy('createdAt', 'desc').get();
        } else {
            const prefix = requestedMode === 'manual' ? 'm-' : requestedMode === 'automatic' ? 'a-' : 's-';
            plantsSnapshot = await plantsRef
                .where('uniqueId', '>=', prefix)
                .where('uniqueId', '<', prefix + '\uf8ff')
                .orderBy('uniqueId')
                .get();
        }

        const plants = [];
        plantsSnapshot.forEach(doc => {
            const data = doc.data();
            plants.push({
                id: doc.id,
                uniqueId: data.uniqueId,
                name: data.name || '',
                description: data.description || '',
                status: data.status || 'unknown',
                mode: data.mode || 'manual',
                createdAt: data.createdAt ? data.createdAt.toDate() : null
            });
        });

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const records = [];
        
        // Get all activities for the time period first
        const activitiesSnapshot = await activitiesRef
            .where('startTime', '>=', startDate)
            .orderBy('startTime', 'desc')
            .get();

        const plantIds = new Set(plants.map(p => p.id));
        activitiesSnapshot.forEach(doc => {
            const activity = doc.data();
            const plant = plants.find(p => p.id === activity.details?.plantId);
            if (plant) {
                const record = {
                    plantId: plant.uniqueId,
                    plantName: plant.name,
                    description: plant.description,
                    date: activity.startTime.toDate().toLocaleDateString(),
                    time: activity.startTime.toDate().toLocaleTimeString(),
                    duration: activity.duration || 0,
                    status: activity.status || 'completed'
                };

                // Add mode-specific data
                if (requestedMode === 'automatic') {
                    record.moistureLevel = activity.details?.moistureLevel || 'N/A';
                    record.triggerThreshold = '45%';  // Default threshold
                    record.sensor = activity.details?.sensorId || 'N/A';
                } else if (requestedMode === 'scheduled') {
                    record.scheduleTime = activity.details?.scheduledTime ? 
                        new Date(activity.details.scheduledTime).toLocaleTimeString() : 'N/A';
                    record.frequency = activity.details?.frequency || 'Daily';
                    record.nextSchedule = activity.details?.nextSchedule ?
                        new Date(activity.details.nextSchedule).toLocaleString() : 'N/A';
                } else {
                    record.triggeredBy = activity.details?.triggeredBy || 'Water Now button';
                    record.userNote = activity.details?.note || '';
                }

                records.push(record);
            }
        });

        // Calculate statistics
        const stats = {
            totalPlants: plants.length,
            totalActivities: records.length,
            plantsPerMode: {
                automatic: plants.filter(p => p.mode === 'automatic').length,
                manual: plants.filter(p => p.mode === 'manual').length,
                scheduled: plants.filter(p => p.mode === 'scheduled').length
            },
            averageDuration: records.length > 0 
                ? Math.round(records.reduce((acc, curr) => acc + curr.duration, 0) / records.length) 
                : 0
        };

        // Mode-specific stats
        const modeStats = {
            automatic: {
                activePlants: records.filter(r => r.plantId.startsWith('a-')).length,
                averageMoistureLevel: records.filter(r => r.plantId.startsWith('a-')).length > 0
                    ? Math.round(records.filter(r => r.plantId.startsWith('a-'))
                        .reduce((acc, curr) => acc + (parseInt(curr.moistureLevel) || 0), 0) / 
                        records.filter(r => r.plantId.startsWith('a-')).length)
                    : 0
            },
            manual: {
                activePlants: records.filter(r => r.plantId.startsWith('m-')).length
            },
            scheduled: {
                activePlants: records.filter(r => r.plantId.startsWith('s-')).length,
                dailySchedules: records.filter(r => r.plantId.startsWith('s-') && r.frequency === 'Daily').length,
                weeklySchedules: records.filter(r => r.plantId.startsWith('s-') && r.frequency === 'Weekly').length
            }
        };

        // Sort records by date
        const sortedRecords = records.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add plant details table
        const plantDetails = plants.map(p => ({
            uniqueId: p.uniqueId,
            name: p.name,
            description: p.description,
            status: p.status,
            mode: p.mode,
            createdAt: p.createdAt.toLocaleDateString()
        }));

        // Export based on format
        const exportFormat = req.query.format;
        if (exportFormat === 'pdf') {
            return await exportToPDF(res, sortedRecords, requestedMode, stats, startDate, plantDetails, modeStats);
        } else if (exportFormat === 'excel') {
            return await exportToExcel(res, sortedRecords, requestedMode, stats, startDate, plantDetails, modeStats);
        }

        // Default JSON response if no format specified
        res.json({
            success: true,
            records: sortedRecords,
            plantDetails: plantDetails,
            metadata: {
                mode: requestedMode,
                stats,
                modeStats,
                dateRange: {
                    from: startDate.toISOString(),
                    to: new Date().toISOString()
                },
                exportTimestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in export operation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

/**
 * Export data to PDF format
 */
async function exportToPDF(res, records, mode, stats, startDate, plantDetails, modeStats) {
    try {
        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=plant_system_report_${new Date().toISOString().split('T')[0]}.pdf`);

        // Create PDF document
        const PDFDocument = (await import('pdfkit')).default;
        const doc = new PDFDocument({ margin: 30 });
        doc.pipe(res);

        // Add title
        doc.fontSize(18)
           .text('Plant Watering System Report', { align: 'center' })
           .moveDown();

        if (mode !== 'all') {
            doc.fontSize(16)
               .text(`${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode Records`, { align: 'center' })
               .moveDown();
        }

        // Add metadata
        doc.fontSize(10)
           .text(`Generated on: ${new Date().toLocaleString()}`)
           .text(`Date Range: ${startDate.toLocaleDateString()} to ${new Date().toLocaleDateString()}`)
           .moveDown();

        // Add overall statistics
        doc.fontSize(14)
           .text('System Overview:', { underline: true })
           .fontSize(10)
           .text(`Total Plants: ${stats.totalPlants}`)
           .text(`Total Activities: ${stats.totalActivities}`)
           .text(`Average Duration: ${stats.averageDuration} minutes`)
           .moveDown()
           .text('Plants by Mode:')
           .text(`Automatic: ${stats.plantsPerMode.automatic}`)
           .text(`Manual: ${stats.plantsPerMode.manual}`)
           .text(`Scheduled: ${stats.plantsPerMode.scheduled}`)
           .moveDown();

        // Add mode-specific statistics
        doc.fontSize(14)
           .text('Mode-Specific Statistics:', { underline: true })
           .fontSize(10);

        // Automatic mode stats
        doc.text('Automatic Mode:')
           .text(`Active Plants: ${modeStats.automatic.activePlants}`)
           .text(`Average Moisture Level: ${modeStats.automatic.averageMoistureLevel}%`)
           .moveDown();

        // Manual mode stats
        doc.text('Manual Mode:')
           .text(`Active Plants: ${modeStats.manual.activePlants}`)
           .moveDown();

        // Scheduled mode stats
        doc.text('Scheduled Mode:')
           .text(`Active Plants: ${modeStats.scheduled.activePlants}`)
           .text(`Daily Schedules: ${modeStats.scheduled.dailySchedules}`)
           .text(`Weekly Schedules: ${modeStats.scheduled.weeklySchedules}`)
           .moveDown();

        // Plant Details Table
        doc.fontSize(14)
           .text('Plant Details:', { underline: true })
           .moveDown();

        const plantTable = {
            headers: ['ID', 'Name', 'Description', 'Status', 'Mode', 'Created'],
            rows: plantDetails.map(p => [
                p.uniqueId,
                p.name,
                p.description,
                p.status,
                p.mode,
                p.createdAt
            ])
        };

        // Draw plant table
        let y = doc.y;
        const plantColumnWidth = (doc.page.width - 60) / 6;
        
        // Plant table headers
        doc.fontSize(10).font('Helvetica-Bold');
        plantTable.headers.forEach((header, i) => {
            doc.text(header, 30 + (i * plantColumnWidth), y, { 
                width: plantColumnWidth, 
                align: 'center' 
            });
        });

        // Plant table rows
        y += 20;
        doc.font('Helvetica');
        plantTable.rows.forEach((row, rowIndex) => {
            if (y > doc.page.height - 50) {
                doc.addPage();
                y = 50;
                // Redraw headers on new page
                doc.font('Helvetica-Bold');
                plantTable.headers.forEach((header, i) => {
                    doc.text(header, 30 + (i * plantColumnWidth), y, { 
                        width: plantColumnWidth, 
                        align: 'center' 
                    });
                });
                doc.font('Helvetica');
                y += 20;
            }

            row.forEach((cell, i) => {
                doc.text(String(cell || ''), 30 + (i * plantColumnWidth), y, { 
                    width: plantColumnWidth, 
                    align: 'center',
                    lineBreak: false
                });
            });
            y += 20;
        });

        // Add space after plant table
        doc.moveDown(2);

        // Activity Records Table
        if (records.length > 0) {
            doc.fontSize(14)
               .text('Activity Records:', { underline: true })
               .moveDown();

            const activityTable = {
                headers: Object.keys(records[0]),
                rows: records.map(record => Object.values(record))
            };

            // Calculate column widths for activity table
            const columnCount = activityTable.headers.length;
            const columnWidth = (doc.page.width - 60) / columnCount;

            // Draw activity table headers
            y = doc.y;
            doc.fontSize(10).font('Helvetica-Bold');
            activityTable.headers.forEach((header, i) => {
                doc.text(header, 30 + (i * columnWidth), y, { 
                    width: columnWidth, 
                    align: 'center' 
                });
            });

            // Draw activity table rows
            y += 20;
            doc.font('Helvetica');
            activityTable.rows.forEach((row, rowIndex) => {
                if (y > doc.page.height - 50) {
                    doc.addPage();
                    y = 50;
                    // Redraw headers on new page
                    doc.font('Helvetica-Bold');
                    activityTable.headers.forEach((header, i) => {
                        doc.text(header, 30 + (i * columnWidth), y, { 
                            width: columnWidth, 
                            align: 'center' 
                        });
                    });
                    doc.font('Helvetica');
                    y += 20;
                }

                row.forEach((cell, i) => {
                    doc.text(String(cell || ''), 30 + (i * columnWidth), y, { 
                        width: columnWidth, 
                        align: 'center',
                        lineBreak: false
                    });
                });
                y += 20;
            });
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate PDF' });
    }
}

/**
 * Export data to Excel format
 */
async function exportToExcel(res, records, mode, stats, startDate, plantDetails, modeStats) {
    try {
        const XLSX = (await import('xlsx')).default;

        // Set response headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=plant_system_report_${new Date().toISOString().split('T')[0]}.xlsx`);

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Create plants worksheet
        const plants_headers = ['ID', 'Name', 'Description', 'Status', 'Mode', 'Created'];
        const plants_data = [plants_headers];
        plantDetails.forEach(plant => {
            plants_data.push([
                plant.uniqueId,
                plant.name,
                plant.description,
                plant.status,
                plant.mode,
                plant.createdAt
            ]);
        });
        const ws_plants = XLSX.utils.aoa_to_sheet(plants_data);

        // Set plants worksheet column widths
        ws_plants['!cols'] = [
            { wch: 15 }, // ID
            { wch: 25 }, // Name
            { wch: 30 }, // Description
            { wch: 12 }, // Status
            { wch: 12 }, // Mode
            { wch: 15 }  // Created
        ];

        // Create activities worksheet if records exist
        if (records.length > 0) {
            const ws_activities = XLSX.utils.aoa_to_sheet([
                Object.keys(records[0]),
                ...records.map(record => Object.values(record))
            ]);
            ws_activities['!cols'] = Object.keys(records[0]).map(key => 
                EXCEL_COLUMN_WIDTHS[key] || { wch: 12 }
            );
            XLSX.utils.book_append_sheet(wb, ws_activities, 'Activity Records');
        }

        // Create statistics worksheet
        const stats_data = [
            ['System Overview'],
            ['Total Plants', stats.totalPlants],
            ['Total Activities', stats.totalActivities],
            ['Average Duration (minutes)', stats.averageDuration],
            [''],
            ['Plants by Mode'],
            ['Automatic', stats.plantsPerMode.automatic],
            ['Manual', stats.plantsPerMode.manual],
            ['Scheduled', stats.plantsPerMode.scheduled],
            [''],
            ['Mode-Specific Statistics'],
            ['Automatic Mode'],
            ['Active Plants', modeStats.automatic.activePlants],
            ['Average Moisture Level', `${modeStats.automatic.averageMoistureLevel}%`],
            [''],
            ['Manual Mode'],
            ['Active Plants', modeStats.manual.activePlants],
            [''],
            ['Scheduled Mode'],
            ['Active Plants', modeStats.scheduled.activePlants],
            ['Daily Schedules', modeStats.scheduled.dailySchedules],
            ['Weekly Schedules', modeStats.scheduled.weeklySchedules],
            [''],
            ['Report Information'],
            ['Date Range', `${startDate.toLocaleDateString()} to ${new Date().toLocaleDateString()}`],
            ['Generated On', new Date().toLocaleString()]
        ];

        const ws_stats = XLSX.utils.aoa_to_sheet(stats_data);
        ws_stats['!cols'] = [{ wch: 25 }, { wch: 15 }];

        // Add worksheets to workbook
        XLSX.utils.book_append_sheet(wb, ws_plants, 'Plants');
        XLSX.utils.book_append_sheet(wb, ws_stats, 'Statistics');

        // Write to response
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.send(excelBuffer);

    } catch (error) {
        console.error('Excel generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate Excel file' });
    }
}