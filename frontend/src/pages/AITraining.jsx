import { useState, useEffect } from 'react';
import { Bot, Save, Plus, Trash2, UploadCloud, FileText, Check, AlertCircle } from 'lucide-react';
import { 
  getSystemPrompt, updateSystemPrompt, 
  getQAPairs, addQAPair, deleteQAPair,
  getDocuments, uploadDocument, deleteDocument
} from '../api/client';

export default function AITraining() {
  const [activeTab, setActiveTab] = useState('persona');
  
  // Persona State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState(null);

  // Q&A State
  const [qaPairs, setQaPairs] = useState([]);
  const [loadingQA, setLoadingQA] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [addingQA, setAddingQA] = useState(false);

  // Document State
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [{ data: pData }, { data: qData }, { data: dData }] = await Promise.all([
        getSystemPrompt(),
        getQAPairs(),
        getDocuments()
      ]);
      setSystemPrompt(pData.prompt);
      setQaPairs(qData);
      setDocuments(dData);
    } catch (err) {
      console.error('Error loading training data:', err);
    } finally {
      setLoadingQA(false);
      setLoadingDocs(false);
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    setPromptMessage(null);
    try {
      await updateSystemPrompt(systemPrompt);
      setPromptMessage({ type: 'success', text: 'System prompt saved successfully!' });
      setTimeout(() => setPromptMessage(null), 3000);
    } catch (err) {
      setPromptMessage({ type: 'error', text: 'Failed to save system prompt.' });
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleAddQA = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    setAddingQA(true);
    try {
      const { data } = await addQAPair({ question: newQuestion, answer: newAnswer });
      setQaPairs([data, ...qaPairs]);
      setNewQuestion('');
      setNewAnswer('');
    } catch (err) {
      alert('Failed to add Q&A pair');
    } finally {
      setAddingQA(false);
    }
  };

  const handleDeleteQA = async (id) => {
    if (!confirm('Delete this Q&A pair?')) return;
    try {
      await deleteQAPair(id);
      setQaPairs(qaPairs.filter(qa => qa.id !== id));
    } catch (err) {
      alert('Failed to delete Q&A pair');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.type.startsWith('text/')) {
      alert('Please upload a PDF or Text file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(0);
    try {
      // Optistic local state for immediately showing processing status
      const tempId = Date.now();
      setDocuments([{ id: tempId, filename: file.name, status: 'processing', created_at: new Date().toISOString() }, ...documents]);

      await uploadDocument(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      
      // Reload documents to get real DB status
      setTimeout(async () => {
        const { data } = await getDocuments();
        setDocuments(data);
        setUploading(false);
      }, 2000); 

    } catch (err) {
      alert('Upload failed: ' + err.message);
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    if (!confirm('Delete this document? The AI will no longer use its contents.')) return;
    try {
      await deleteDocument(id);
      setDocuments(documents.filter(d => d.id !== id));
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8 border-b border-gray-100 pb-6 flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
          <Bot className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI Training</h1>
          <p className="text-gray-500 mt-1">Train your WhatsApp agent by giving it rules, Q&A, and company knowledge.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-gray-100/50 rounded-xl inline-flex custom-scrollbar overflow-x-auto w-full md:w-auto">
        {[
          { id: 'persona', label: 'Bot Persona & Rules' },
          { id: 'qa', label: 'Q&A Pairs' },
          { id: 'knowledge', label: 'Knowledge Base (Docs)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* --- PERSONA TAB --- */}
        {activeTab === 'persona' && (
          <div className="p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-2">System Instructions</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-3xl">
              Write plain English instructions for exactly how the AI should behave. It will follow this prompt before answering any question. If left blank, it will use its default Real Estate Agent personality.
            </p>
            
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are an assistant for Metro Realty. Always be polite. Never negotiate prices. Always ask for email addresses."
              className="w-full h-80 p-4 border border-gray-200 bg-gray-50 focus:bg-white rounded-xl text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
            />
            
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
              >
                <Save className="w-4 h-4" />
                {savingPrompt ? 'Saving...' : 'Save Instructions'}
              </button>
              
              {promptMessage && (
                <div className={`flex items-center gap-2 text-sm font-medium ${promptMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {promptMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {promptMessage.text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Q&A TAB --- */}
        {activeTab === 'qa' && (
          <div className="flex flex-col md:flex-row h-full">
            <div className="p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Add New QA Pair</h2>
              <p className="text-xs text-gray-400 mb-6">Force the AI to answer specific questions exactly how you want.</p>
              
              <form onSubmit={handleAddQA} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">If user asks...</label>
                  <input
                    type="text"
                    required
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. Do you have 2BHK flats?"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1">AI must reply...</label>
                  <textarea
                    required
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    rows={4}
                    placeholder="e.g. We have several 2BHKs starting at ₹60L."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={addingQA}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {addingQA ? 'Adding...' : 'Add QA Pair'}
                </button>
              </form>
            </div>
            
            <div className="p-8 md:w-2/3 max-h-[600px] overflow-y-auto custom-scrollbar bg-white">
              {loadingQA ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
              ) : qaPairs.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No custom Q&A pairs added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {qaPairs.map(qa => (
                    <div key={qa.id} className="p-4 border border-gray-200 rounded-xl relative group hover:border-indigo-200 transition-colors bg-white">
                      <div className="pr-10">
                        <p className="text-sm font-bold text-gray-800 mb-1">Q: {qa.question}</p>
                        <p className="text-sm text-gray-600">A: {qa.answer}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteQA(qa.id)}
                        className="absolute top-4 right-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- KNOWLEDGE DOCUMENTS TAB --- */}
        {activeTab === 'knowledge' && (
          <div className="p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Upload Documents</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Upload PDFs, text files, or price sheets. The AI will read these files and use them to answer customer questions automatically.
                </p>
                
                <label className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-700">Click to upload file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF or TXT up to 10MB</p>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                
                {uploading && (
                  <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-700 mb-2">
                      <span>Uploading & Analyzing...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-indigo-200/50 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:w-2/3">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Your Knowledge Base</h3>
                {loadingDocs ? (
                   <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="p-4 border border-gray-200 rounded-xl flex items-start gap-3 bg-white hover:border-indigo-200 transition-colors group">
                        <div className={`p-2 rounded-lg ${doc.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : doc.status === 'processing' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-800 truncate">{doc.filename}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">
                            {doc.status === 'completed' ? <span className="text-emerald-600">Active</span> : 
                             doc.status === 'processing' ? <span className="text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"/> Processing</span> : 
                             <span className="text-red-500">Failed</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
