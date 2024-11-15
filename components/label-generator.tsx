'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LabelItem {
  Brand: string;
  Collection: string;
  "Product Series": string;
  "Background template": string;
  "Color Name": string;
  "Color Number": string;
  Finish: string | null;
}

export const LabelGenerator = () => {
  const [labelData, setLabelData] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedColorName, setSelectedColorName] = useState('');
  const [selectedColorNumber, setSelectedColorNumber] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');
  const [showPrintLayout, setShowPrintLayout] = useState(false);

  useEffect(() => {
    const loadCSV = async () => {
      try {
        const response = await fetch('/data/labelData.csv');
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const parsedData = lines
          .slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',').map(value => value.trim());
            return {
              Brand: values[0] || '',
              Collection: values[1] || '',
              "Product Series": values[2] || '',
              "Background template": values[3] || '',
              "Color Name": values[4] || '',
              "Color Number": values[5] || '',
              Finish: values[6] || null
            } as LabelItem;
          });

        setLabelData(parsedData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading CSV:', err);
        setError('Failed to load label data');
        setLoading(false);
      }
    };

    loadCSV();
  }, []);

  const getTemplatePath = (templateName: string) => {
    if (!templateName) return null;
    const cleanName = templateName.trim();
    return `/templates/daltile/${cleanName}`;
  };

  const Label = ({ scale = 1}) => {
    const selectedData = labelData.find(item => 
      item.Brand === selectedBrand &&
      (selectedCollection === '' || item.Collection === selectedCollection) &&
      item['Product Series'] === selectedSeries &&
      (!selectedColorName || item['Color Name'] === selectedColorName) &&
      (!selectedColorNumber || item['Color Number'] === selectedColorNumber)
    );

    const templatePath = selectedData ? getTemplatePath(selectedData['Background template']) : null;
    
    const baseWidth = 2 * 96;  // 2 inches at 96 DPI
    const baseHeight = 3 * 96; // 3 inches at 96 DPI

    const textContainerStyle = {
      position: 'absolute' as const,
      bottom: '0.5in',
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
    };

    const textStyle = {
      fontFamily: 'Geometria, Arial, sans-serif',
      fontSize: `${8 * scale}px`,
      lineHeight: '1.2',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
      fontWeight: '500',
      color: '#000000',
      margin: '1px 0',
    };

    return (
      <div 
        className="relative bg-white"
        style={{
          width: `${baseWidth * scale}px`,
          height: `${baseHeight * scale}px`,
        }}
      >
        {templatePath && (
          <img 
            src={templatePath}
            alt="Label Template"
            className="w-full h-full object-contain"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              console.error('Template load error:', templatePath);
              e.currentTarget.src = "/api/placeholder/192/288";
            }}
          />
        )}
        
        <div style={textContainerStyle}>
          <div style={textStyle}>
            {selectedColorName}
            {selectedColorName && selectedColorNumber && " "}
            {selectedColorNumber}
          </div>
          {selectedFinish && selectedFinish !== "NULL" && (
            <div style={textStyle}>
              {selectedFinish}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PrintLayout = () => {
    return (
      <div 
        className="bg-white"
        style={{
          width: '11in',
          height: '8.5in',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 2in)',
            gridTemplateRows: 'repeat(2, 3in)',
            gap: '0.25in',
            pageBreakAfter: 'always',
            pageBreakInside: 'avoid',
            margin: 0,
            padding: 0
          }}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <div 
              key={index} 
              style={{ 
                width: '2in', 
                height: '3in',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              <Label scale={1} />
            </div>
          ))}
        </div>
      </div>
    );
  };
  const brands = useMemo(() => [...new Set(labelData.map(item => item.Brand))], [labelData]);
  
  const collections = useMemo(() => {
    if (!selectedBrand) return [];
    return ['', ...new Set(labelData
      .filter(item => item.Brand === selectedBrand)
      .map(item => item.Collection))]
      .filter(collection => collection !== null);
  }, [selectedBrand, labelData]);

  const series = useMemo(() => {
    if (!selectedBrand) return [];
    return [...new Set(labelData
      .filter(item => 
        item.Brand === selectedBrand && 
        (selectedCollection === '' || item.Collection === selectedCollection))
      .map(item => item['Product Series']))];
  }, [selectedBrand, selectedCollection, labelData]);

  const colorNames = useMemo(() => {
    if (!selectedSeries) return [];
    return [...new Set(labelData
      .filter(item => 
        item.Brand === selectedBrand && 
        (selectedCollection === '' || item.Collection === selectedCollection) && 
        item['Product Series'] === selectedSeries)
      .map(item => item['Color Name']))];
  }, [selectedBrand, selectedCollection, selectedSeries, labelData]);

  const colorNumbers = useMemo(() => {
    if (!selectedSeries) return [];
    const filtered = labelData.filter(item => 
      item.Brand === selectedBrand && 
      (selectedCollection === '' || item.Collection === selectedCollection) && 
      item['Product Series'] === selectedSeries &&
      (!selectedColorName || item['Color Name'] === selectedColorName)
    );
    return [...new Set(filtered.map(item => item['Color Number']))];
  }, [selectedBrand, selectedCollection, selectedSeries, selectedColorName, labelData]);

  const finishes = useMemo(() => {
    if (!selectedSeries) return [];
    const filtered = labelData.filter(item => 
      item.Brand === selectedBrand && 
      (selectedCollection === '' || item.Collection === selectedCollection) && 
      item['Product Series'] === selectedSeries &&
      (!selectedColorName || item['Color Name'] === selectedColorName) &&
      (!selectedColorNumber || item['Color Number'] === selectedColorNumber)
    );
    return [...new Set(filtered.map(item => item.Finish))]
      .filter(finish => finish && finish !== "NULL");
  }, [selectedBrand, selectedCollection, selectedSeries, selectedColorName, selectedColorNumber, labelData]);

  const handleGeneratePDF = async () => {
    const printLayout = document.getElementById('print-layout');
    if (!printLayout) return;

    try {
      const width = 11 * 96;
      const height = 8.5 * 96;

      const canvas = await html2canvas(printLayout, {
        scale: 4,
        useCORS: true,
        logging: false,
        width: width,
        height: height,
        backgroundColor: '#ffffff',
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'in',
        format: [11, 8.5]
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 11, 8.5, undefined, 'FAST');
      pdf.save('labels.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading label data...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setSelectedCollection('');
                setSelectedSeries('');
                setSelectedColorName('');
                setSelectedColorNumber('');
                setSelectedFinish('');
              }}
            >
              <option value="">Select Brand</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedCollection}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                setSelectedSeries('');
                setSelectedColorName('');
                setSelectedColorNumber('');
                setSelectedFinish('');
              }}
              disabled={!selectedBrand}
            >
              <option value="">All Collections</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>
                  {collection || '(No Collection)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Series</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedSeries}
              onChange={(e) => {
                setSelectedSeries(e.target.value);
                setSelectedColorName('');
                setSelectedColorNumber('');
                setSelectedFinish('');
              }}
              disabled={!selectedBrand}
            >
              <option value="">Select Series</option>
              {series.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color Name (Optional)</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedColorName}
              onChange={(e) => setSelectedColorName(e.target.value)}
              disabled={!selectedSeries}
            >
              <option value="">Select Color Name</option>
              {colorNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color Number (Optional)</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedColorNumber}
              onChange={(e) => setSelectedColorNumber(e.target.value)}
              disabled={!selectedSeries}
            >
              <option value="">Select Color Number</option>
              {colorNumbers.map(number => (
                <option key={number} value={number}>{number}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Finish (Optional)</label>
            <select 
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              value={selectedFinish}
              onChange={(e) => setSelectedFinish(e.target.value)}
              disabled={!selectedSeries || finishes.length === 0}
            >
              <option value="">Select Finish</option>
              {finishes.map(finish => (
                <option key={finish} value={finish}>{finish}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white min-h-[384px] flex items-center justify-center">
          <Label scale={1} />
        </div>
      </div>

      <Dialog open={showPrintLayout} onOpenChange={setShowPrintLayout}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
          <div id="print-layout" className="bg-white flex items-center justify-center">
            <PrintLayout />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setShowPrintLayout(false)}
            >
              Close
            </button>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              onClick={handleGeneratePDF}
            >
              Download PDF
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-8">
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={() => setShowPrintLayout(true)}
        >
          Preview Print Layout
        </button>
      </div>
    </div>
  );
};
