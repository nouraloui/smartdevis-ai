// backend/src/services/pdf.service.js
const PDFDocument = require('pdfkit');

exports.generateDevisPDF = (devis) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const RED   = '#C0392B';
    const DARK  = '#2C2C2C';
    const LIGHT = '#F5F5F5';

    // ── En-tête ───────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill(RED);
    doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
       .text('SMARTDEVIS AI — AFRICA ENGINEERING', 60, 20);
    doc.fontSize(12).font('Helvetica')
       .text(`Devis : ${devis.code_devis}  |  Statut : ${devis.statut.toUpperCase()}  |  Date : ${new Date().toLocaleDateString('fr-FR')}`, 60, 46);

    // ── Info projet ───────────────────────────────────────────
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('PROJET :', 40, 85);
    doc.font('Helvetica').text(`${devis.projet?.nom || 'N/A'}  —  Code : ${devis.projet?.code_projet || ''}`, 100, 85);

    // ── Tableau des lignes ────────────────────────────────────
    const tableTop = 115;
    const cols = [
      { label: 'Désignation',   x: 40,   w: 160 },
      { label: 'Unité',         x: 200,  w: 40  },
      { label: 'Qté',           x: 240,  w: 35  },
      { label: 'PU FCFA',       x: 275,  w: 80  },
      { label: 'Montant FCFA',  x: 355,  w: 90  },
      { label: 'Montant EUR',   x: 445,  w: 70  },
      { label: 'Prix Rev. EUR', x: 515,  w: 70  },
      { label: 'Marge Nette',   x: 585,  w: 65  },
      { label: '% Marge',       x: 650,  w: 50  },
      { label: 'Anomalie',      x: 700,  w: 55  },
    ];

    // En-tête tableau
    doc.rect(40, tableTop, doc.page.width - 80, 20).fill(RED);
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
    cols.forEach(col => doc.text(col.label, col.x, tableTop + 5, { width: col.w }));

    // Lignes tableau
    let y = tableTop + 22;
    devis.lignes.forEach((ligne, i) => {
      const bgColor = i % 2 === 0 ? LIGHT : 'white';
      doc.rect(40, y, doc.page.width - 80, 18).fill(bgColor);

      doc.fillColor(ligne.ia_anomalie ? RED : DARK).fontSize(7).font('Helvetica');
      const vals = [
        ligne.designation?.substring(0, 28) || '',
        ligne.unite || '',
        ligne.quantite_contrat?.toFixed(0) || '0',
        new Intl.NumberFormat('fr-FR').format(ligne.pu_contrat_fcfa || 0),
        new Intl.NumberFormat('fr-FR').format(Math.round(ligne.montant_fcfa || 0)),
        new Intl.NumberFormat('fr-FR').format(Math.round(ligne.montant_eur || 0)),
        new Intl.NumberFormat('fr-FR').format(Math.round(ligne.prix_revient_total_eur || 0)),
        new Intl.NumberFormat('fr-FR').format(Math.round(ligne.marge_nette_eur || 0)),
        `${((ligne.marge_nette_pct || 0) * 100).toFixed(1)}%`,
        ligne.ia_anomalie ? '⚠ OUI' : 'Normal',
      ];
      cols.forEach((col, ci) => doc.text(vals[ci], col.x, y + 4, { width: col.w }));
      y += 18;

      // Nouvelle page si nécessaire
      if (y > doc.page.height - 80) { doc.addPage({ layout: 'landscape' }); y = 40; }
    });

    // ── Totaux ────────────────────────────────────────────────
    y += 10;
    doc.rect(40, y, doc.page.width - 80, 50).fill('#FFF5F5').stroke(RED);
    doc.fillColor(RED).fontSize(9).font('Helvetica-Bold').text('TOTAUX', 50, y + 5);
    doc.fillColor(DARK).fontSize(8).font('Helvetica');
    const t = devis.totaux;
    doc.text(`Total Montant FCFA : ${new Intl.NumberFormat('fr-FR').format(Math.round(t?.total_montant_fcfa || 0))}`, 50, y + 18);
    doc.text(`Total Montant EUR  : ${new Intl.NumberFormat('fr-FR').format(Math.round(t?.total_montant_eur || 0))}`, 250, y + 18);
    doc.text(`Total Marge Nette  : ${new Intl.NumberFormat('fr-FR').format(Math.round(t?.total_marge_nette_eur || 0))} EUR`, 450, y + 18);
    doc.text(`% Marge Global     : ${((t?.marge_nette_pct_global || 0) * 100).toFixed(2)}%`, 50, y + 33);
    doc.text(`Anomalies détectées : ${t?.nb_anomalies || 0}`, 250, y + 33);

    doc.end();
  });
};