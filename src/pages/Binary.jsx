import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import './Dashboard.css';

export default function Binary() {
    const [treeData, setTreeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        leftVolume: 0,
        rightVolume: 0,
        leftCarry: 0,
        rightCarry: 0,
        totalMatched: 0,
        totalCommission: 0
    });

    useEffect(() => {
        fetchBinaryTree();
    }, []);

    const fetchBinaryTree = async () => {
        try {
            const response = await fetch('/api/binary/tree.php', {
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                setTreeData(data.data.tree);
                setStats({
                    leftVolume: parseFloat(data.data.tree?.left_volume || 0),
                    rightVolume: parseFloat(data.data.tree?.right_volume || 0),
                    leftCarry: parseFloat(data.data.tree?.left_carry_forward || 0),
                    rightCarry: parseFloat(data.data.tree?.right_carry_forward || 0),
                    totalMatched: parseFloat(data.data.tree?.total_matched || 0),
                    totalCommission: parseFloat(data.data.total_commission || 0)
                });
            }
        } catch (error) {
            console.error('Error fetching binary tree:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderTreeNode = (node, position = 'root') => {
        if (!node) {
            return (
                <div className="tree-node empty">
                    <div className="node-content">
                        <div className="node-icon">👤</div>
                        <div className="node-info">
                            <div className="node-name">Empty</div>
                            <div className="node-position">{position}</div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="tree-node">
                <div className="node-content">
                    <div className="node-icon" style={{ background: 'hsl(250, 70%, 40%)' }}>
                        {node.first_name?.[0] || '?'}
                    </div>
                    <div className="node-info">
                        <div className="node-name">{node.first_name} {node.last_name}</div>
                        <div className="node-position">{position}</div>
                        <div className="node-volume">${parseFloat(node.volume || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ padding: '3rem 0' }}>
                    <div className="glass-card fade-in">
                        <h1>Loading...</h1>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container" style={{ padding: '3rem 0' }}>
                {/* Header */}
                <div className="fade-in" style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌳 Binary Tree</h1>
                    <p className="text-muted">View your binary network structure and earnings</p>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid fade-in" style={{ marginBottom: '2rem' }}>
                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Left Volume</h3>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>${stats.leftVolume.toFixed(2)}</h2>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            Carry: ${stats.leftCarry.toFixed(2)}
                        </p>
                    </div>

                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Right Volume</h3>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>${stats.rightVolume.toFixed(2)}</h2>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                            Carry: ${stats.rightCarry.toFixed(2)}
                        </p>
                    </div>

                    <div className="glass-card">
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Matched Volume</h3>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>${stats.totalMatched.toFixed(2)}</h2>
                    </div>

                    <div className="glass-card" style={{ background: 'linear-gradient(135deg, hsl(250, 70%, 25%) 0%, hsl(280, 70%, 30%) 100%)' }}>
                        <h3 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Commission</h3>
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>${stats.totalCommission.toFixed(2)}</h2>
                    </div>
                </div>

                {/* Binary Tree Visualization */}
                <div className="glass-card fade-in" style={{ animationDelay: '0.1s' }}>
                    <h3 style={{ marginBottom: '2rem' }}>Network Structure</h3>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2rem'
                    }}>
                        {/* Root Node (You) */}
                        <div style={{ textAlign: 'center' }}>
                            <div className="tree-node" style={{ display: 'inline-block' }}>
                                <div className="node-content" style={{
                                    background: 'linear-gradient(135deg, hsl(250, 70%, 40%) 0%, hsl(280, 70%, 45%) 100%)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    minWidth: '200px'
                                }}>
                                    <div className="node-icon" style={{
                                        background: 'white',
                                        color: 'hsl(250, 70%, 40%)',
                                        width: '60px',
                                        height: '60px',
                                        fontSize: '2rem',
                                        margin: '0 auto 1rem'
                                    }}>
                                        👤
                                    </div>
                                    <div className="node-info">
                                        <div className="node-name" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>You</div>
                                        <div className="node-position" style={{ opacity: 0.8 }}>Root</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Children Nodes */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '3rem',
                            width: '100%',
                            maxWidth: '600px'
                        }}>
                            {/* Left Child */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    background: 'hsl(250, 30%, 20%)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    border: '2px solid hsl(250, 50%, 30%)'
                                }}>
                                    <div style={{
                                        fontSize: '2.5rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        {treeData?.left_child ? '👤' : '❓'}
                                    </div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        {treeData?.left_child ?
                                            `${treeData.left_child.first_name} ${treeData.left_child.last_name}` :
                                            'Empty Position'
                                        }
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.9rem' }}>Left Leg</div>
                                    {treeData?.left_child && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                            Volume: ${parseFloat(treeData.left_child.volume || 0).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Child */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    background: 'hsl(250, 30%, 20%)',
                                    padding: '1.5rem',
                                    borderRadius: '12px',
                                    border: '2px solid hsl(250, 50%, 30%)'
                                }}>
                                    <div style={{
                                        fontSize: '2.5rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        {treeData?.right_child ? '👤' : '❓'}
                                    </div>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                        {treeData?.right_child ?
                                            `${treeData.right_child.first_name} ${treeData.right_child.last_name}` :
                                            'Empty Position'
                                        }
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.9rem' }}>Right Leg</div>
                                    {treeData?.right_child && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                            Volume: ${parseFloat(treeData.right_child.volume || 0).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Binary Commission Info */}
                <div className="glass-card fade-in" style={{ marginTop: '2rem', animationDelay: '0.2s' }}>
                    <h3>📊 How Binary Commission Works</h3>
                    <ul style={{ marginTop: '1rem', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                        <li>Binary commission is calculated based on 1:1 volume matching</li>
                        <li>Commission rate: 10% of the matched volume</li>
                        <li>Unmatched volume carries forward to the next calculation</li>
                        <li>Both legs must have volume to earn commission</li>
                        <li>Commissions are calculated daily and added to your wallet</li>
                    </ul>
                </div>
            </div>

            <style jsx>{`
                .tree-node {
                    display: inline-block;
                }

                .node-content {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: hsl(250, 30%, 20%);
                    border-radius: 12px;
                    border: 2px solid hsl(250, 30%, 30%);
                    transition: all 0.3s ease;
                }

                .tree-node.empty .node-content {
                    opacity: 0.5;
                    border-style: dashed;
                }

                .node-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: hsl(250, 70%, 40%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: bold;
                }

                .node-info {
                    text-align: left;
                }

                .node-name {
                    font-weight: bold;
                    font-size: 1rem;
                }

                .node-position {
                    font-size: 0.85rem;
                    opacity: 0.7;
                    margin-top: 0.25rem;
                }

                .node-volume {
                    font-size: 0.9rem;
                    color: hsl(150, 70%, 60%);
                    margin-top: 0.25rem;
                }
            `}</style>
        </>
    );
}
