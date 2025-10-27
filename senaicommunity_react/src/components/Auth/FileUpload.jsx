import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = ({ file, setFile }) => {
    const [preview, setPreview] = useState(null);

    const onDrop = useCallback(acceptedFiles => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    }, [setFile]);

    // ✅ --- CORREÇÃO APLICADA AQUI --- ✅
    // Substituído 'image/*' por um objeto com tipos MIME específicos
    // para corrigir os avisos no console do react-dropzone.
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/jpeg': ['.jpeg', '.jpg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
            'image/gif': ['.gif']
        }
    });
    // --- FIM DA CORREÇÃO ---

    const removeImage = () => {
        setFile(null);
        setPreview(null);
    };

    if (preview) {
        return (
            <div className="file-upload-wrapper" onClick={removeImage} style={{ cursor: 'pointer' }}>
                <img id="image-preview" src={preview} alt="Pré-visualização" />
            </div>
        );
    }

    return (
        <div className="file-upload-wrapper">
            <div {...getRootProps({ className: `file-upload-label ${isDragActive ? 'drag-over' : ''}` })}>
                <input {...getInputProps()} />
                <div id="upload-instructions">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p><strong>Arraste uma foto</strong> ou clique para selecionar</p>
                    <span id="file-name">{file ? file.name : 'Nenhum arquivo selecionado'}</span>
                </div>
            </div>
        </div>
    );
};

export default FileUpload;